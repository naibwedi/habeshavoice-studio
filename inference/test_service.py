import io
import os
import math
import shutil
import struct
import wave
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
import service

KEY = "test-only-key-" + "a" * 32
class Engine:
    def transcribe(self, paths, language):
        assert all(p.exists() for p in paths)
        return "ሰላም" if language == "ti" else "ሰላም!"
def wav_bytes(seconds=1, silent=False):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(16000)
        wav.writeframes(b"".join(struct.pack("<h", 0 if silent else int(4000 * math.sin(i * .1))) for i in range(int(seconds * 16000))))
    return buf.getvalue()
@pytest.fixture
def client(monkeypatch):
    def decode(source, output):
        shutil.copyfile(source, output)
        with wave.open(str(output), "rb") as wav:
            duration = wav.getnframes() / wav.getframerate()
        if duration > 300.5:
            raise service.HTTPException(422, "Too long")
        return duration
    monkeypatch.setattr(service, "decode_audio", decode)
    with TestClient(service.create_app(Engine(), KEY)) as c:
        yield c
def test_requires_auth_before_parsing(client):
    assert client.post("/v1/transcribe", content=b"not multipart").status_code == 401
def test_health(client):
    assert client.get("/healthz").json() == {"ready": True}
@pytest.mark.parametrize("language", ["ti", "am"])
def test_transcribe_and_cleanup(client, language, monkeypatch):
    seen = []
    def run(self, paths, lang):
        seen.extend(paths); return "ሰላም"
    monkeypatch.setattr(Engine, "transcribe", run)
    r = client.post("/v1/transcribe", headers={"Authorization": "Bearer " + KEY}, data={"language":language}, files={"audio":("sample.wav",wav_bytes(),"audio/wav")})
    assert r.status_code == 200
    assert r.json() == {"text":"ሰላም","duration":1.0}
    assert seen and all(not p.exists() for p in seen)
def test_rejects_unsupported_language(client):
    assert client.post("/v1/transcribe", headers={"Authorization": "Bearer " + KEY}, data={"language":"en"}, files={"audio":("sample.wav",wav_bytes(),"audio/wav")}).status_code == 422
def test_rejects_empty_audio(client):
    assert client.post("/v1/transcribe", headers={"Authorization": "Bearer " + KEY}, data={"language":"ti"}, files={"audio":("sample.wav",b"","audio/wav")}).status_code == 422
def test_silence_not_sent_to_model(client):
    assert client.post("/v1/transcribe", headers={"Authorization": "Bearer " + KEY}, data={"language":"ti"}, files={"audio":("sample.wav",wav_bytes(silent=True),"audio/wav")}).status_code == 422
def test_chunk_bounds(tmp_path):
    p = tmp_path / "long.wav"; p.write_bytes(wav_bytes(61))
    chunks = service.split_audio(p,tmp_path)
    lengths = []
    for c in chunks:
        with wave.open(str(c),"rb") as f: lengths.append(f.getnframes()/f.getframerate())
    assert len(lengths) >= 3
    assert max(lengths) <= 25
    assert sum(lengths) == 61
def test_fails_closed_without_key():
    with pytest.raises(RuntimeError,match="ASR_API_KEY"):
        with TestClient(service.create_app(Engine(),"")): pass
def test_body_limit(client,monkeypatch):
    monkeypatch.setattr(service,"MAX_BYTES",10)
    r=client.post("/v1/transcribe",headers={"Authorization":"Bearer "+KEY},data={"language":"ti"},files={"audio":("sample.wav",b"x"*70000,"audio/wav")})
    assert r.status_code==413
def test_real_decoder(tmp_path):
    if not shutil.which(os.getenv("FFMPEG_PATH", "ffmpeg")): pytest.skip("FFmpeg is not installed")
    source=tmp_path/"source.wav"; source.write_bytes(wav_bytes())
    assert service.decode_audio(source,tmp_path/"decoded.wav")==1

