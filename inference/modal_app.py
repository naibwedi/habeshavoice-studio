"""Modal deployment for the private HabeshaVoice speech engine.

Deploy with: modal deploy inference/modal_app.py
The habeshavoice-asr-v2 secret must contain ASR_API_KEY (32+ characters).
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

import modal

HERE = Path(__file__).resolve().parent
app = modal.App("habeshavoice-asr-v2")
model_cache = modal.Volume.from_name("habeshavoice-model-cache", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libsndfile1", "libgomp1")
    .pip_install_from_requirements(str(HERE / "requirements.txt"))
    .pip_install("torch==2.8.0", "transformers==4.57.6", "numpy>=1.26,<3")
    .workdir("/app")
    .env({
        "ASR_DEVICE": "cuda",
        "ASR_MODEL": "badrex/Ethio-ASR-multilingual-600M",
    })
    .add_local_file(str(HERE / "service.py"), "/app/service.py")
)


@app.function(
    image=image,
    gpu="L4",
    cpu=1,
    memory=16384,
    timeout=180,
    startup_timeout=600,
    max_containers=1,
    min_containers=0,
    scaledown_window=90,
    volumes={"/mnt/habesha_weights": model_cache},
    secrets=[modal.Secret.from_name("habeshavoice-asr-v2")],
)
@modal.asgi_app()
def inference_api():
    import os
    os.environ["HF_HOME"] = "/mnt/habesha_weights/huggingface"
    os.environ["XDG_CACHE_HOME"] = "/mnt/habesha_weights"
    from service import app as api

    original_lifespan = api.router.lifespan_context

    @asynccontextmanager
    async def cached_lifespan(fastapi_app):
        async with original_lifespan(fastapi_app):
            # Persist model downloads so the next cold start does not fetch them.
            await model_cache.commit.aio()
            yield

    api.router.lifespan_context = cached_lifespan
    return api
