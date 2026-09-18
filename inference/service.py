"""Private inference service. No demo/fake inference path is deployed."""
from __future__ import annotations
import hmac
import os
import shutil
import subprocess
import tempfile
import threading
import wave
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from starlette.responses import JSONResponse

MAX_BYTES = 25 * 1024 * 1024
LANGUAGES = {"ti": "TIR", "am": "AMH"}
class PayloadTooLarge(Exception):
    pass

class GuardMiddleware:
    def __init__(self, app, key):
        self.app, self.key = app, key
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["path"] != "/v1/transcribe":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        expected = ("Bearer " + self.key()).encode()
        if not hmac.compare_digest(headers.get(b"authorization", b""), expected):
            return await JSONResponse({"detail": "Unauthorized"}, status_code=401)(scope, receive, send)
        total = 0
        async def bounded_receive():
            nonlocal total
            message = await receive()
            total += len(message.get("body", b""))
            if total > MAX_BYTES + 65536:
                raise HTTPException(413, "Upload exceeds 25 MB")
            return message
        return await self.app(scope, bounded_receive, send)

def decode_audio(source: Path, output: Path) -> float:
    try:
        subprocess.run(
            [os.getenv("FFMPEG_PATH", "ffmpeg"), "-nostdin", "-hide_banner", "-loglevel", "error",
             "-protocol_whitelist", "file,pipe", "-format_whitelist", "mp3,wav,mov,matroska,ogg,flac",
             "-i", str(source), "-vn", "-ac", "1", "-ar", "16000",
             "-t", "301", "-c:a", "pcm_s16le", "-y", str(output)],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=30,
        )
        with wave.open(str(output), "rb") as wav:
            duration = wav.getnframes() / wav.getframerate()
        if duration <= 0 or duration > 300.5:
            raise HTTPException(422, "Audio must be between 0 and 300 seconds")
        return duration
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, wave.Error, EOFError):
        raise HTTPException(422, "Audio could not be decoded") from None

def split_audio(path: Path, directory: Path) -> list[Path]:
    """Bound chunks to 25 seconds; choose the quietest boundary in the last 5s."""
    import array
    import math
    with wave.open(str(path), "rb") as wav:
        rate, frames = wav.getframerate(), wav.readframes(wav.getnframes())
    samples = array.array("h", frames)
    if os.sys.byteorder != "little":
        samples.byteswap()
    result, start = [], 0
    while start < len(samples):
        end = min(start + 25 * rate, len(samples))
        if end < len(samples):
            candidates = range(start + 20 * rate, end, rate // 5)
            end = min(candidates, key=lambda p: sum(int(x) ** 2 for x in samples[p:p + rate // 10]))
        segment = samples[start:end]
        rms = math.sqrt(sum(int(x) ** 2 for x in segment) / max(1, len(segment)))
        if rms >= 40:  # Do not invent transcripts for near-silent chunks.
            dest = directory / ("segment-" + str(len(result)) + ".wav")
            with wave.open(str(dest), "wb") as out:
                out.setnchannels(1); out.setsampwidth(2); out.setframerate(rate)
                if os.sys.byteorder != "little":
                    segment.byteswap()
                out.writeframes(segment.tobytes())
            result.append(dest)
        start = end
    return result

class EthioASREngine:
    def __init__(self):
        import numpy as np
        import torch
        from transformers import AutoModelForCTC, AutoProcessor
        self.np = np
        self.torch = torch
        self.device = os.getenv("ASR_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
        model_id = os.getenv("ASR_MODEL", "badrex/Ethio-ASR-multilingual-600M")
        self.processor = AutoProcessor.from_pretrained(model_id)
        self.model = AutoModelForCTC.from_pretrained(model_id).to(self.device).eval()

    def transcribe(self, paths: list[Path], language: str) -> str:
        texts = []
        for path in paths:
            with wave.open(str(path), "rb") as wav:
                audio = self.np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2").astype(self.np.float32) / 32768.0
            inputs = self.processor(audio, sampling_rate=16000, return_tensors="pt")
            inputs = {key: value.to(self.device) for key, value in inputs.items()}
            with self.torch.inference_mode():
                logits = self.model(**inputs).logits
            text = self.processor.batch_decode(logits.argmax(dim=-1))[0].strip()
            for tag in ("[TIR]", "[AMH]"):
                if text.startswith(tag):
                    text = text[len(tag):].strip()
                    break
            if text:
                texts.append(text)
        return "\n\n".join(texts)

def create_app(engine=None, api_key: str | None = None) -> FastAPI:
    lock = threading.Lock()
    state = {"engine": engine, "key": api_key if api_key is not None else os.getenv("ASR_API_KEY", ""), "ready": False}
    @asynccontextmanager
    async def lifespan(app):
        if len(state["key"]) < 32:
            raise RuntimeError("ASR_API_KEY must contain at least 32 characters")
        if state["engine"] is None:
            if not shutil.which(os.getenv("FFMPEG_PATH", "ffmpeg")):
                raise RuntimeError("FFmpeg is required")
            state["engine"] = EthioASREngine()
        state["ready"] = True
        yield
        state["ready"] = False
    app = FastAPI(title="HabeshaVoice Inference", version="1.0.0", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(GuardMiddleware, key=lambda: state["key"])
    @app.get("/healthz")
    def health():
        return JSONResponse({"ready": state["ready"]}, status_code=200 if state["ready"] else 503)
    @app.post("/v1/transcribe")
    def transcribe(audio: UploadFile = File(...), language: Literal["ti", "am"] = Form(...)):
        if not state["ready"]:
            raise HTTPException(503, "Model is not ready")
        if not lock.acquire(blocking=False):
            raise HTTPException(429, "Inference worker is busy", headers={"Retry-After": "15"})
        try:
            with tempfile.TemporaryDirectory(prefix="habeshavoice-") as tmp:
                directory = Path(tmp)
                source = directory / "input.bin"
                count = 0
                with source.open("wb") as out:
                    while chunk := audio.file.read(1024 * 1024):
                        count += len(chunk)
                        if count > MAX_BYTES:
                            raise HTTPException(413, "Audio exceeds 25 MB")
                        out.write(chunk)
                if not count:
                    raise HTTPException(422, "Audio is empty")
                normalized = directory / "normalized.wav"
                duration = decode_audio(source, normalized)
                paths = split_audio(normalized, directory)
                if not paths:
                    raise HTTPException(422, "No audible speech was found")
                text = state["engine"].transcribe(paths, language)
                if not text.strip():
                    raise HTTPException(422, "No speech could be transcribed")
                if len(text) > 50000:
                    raise HTTPException(422, "Transcript exceeds the supported length")
                return {"text": text, "duration": duration}
        finally:
            audio.file.close()
            lock.release()
    return app

app = create_app()

