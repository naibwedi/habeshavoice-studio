FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libsndfile1 libgomp1 build-essential cmake && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt requirements-model.txt ./
RUN pip install -r requirements-model.txt
COPY service.py ./
RUN useradd --create-home --uid 10001 appuser
USER appuser
ENV HF_HOME=/home/appuser/.cache/huggingface
EXPOSE 8000
HEALTHCHECK --interval=30s --start-period=600s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz')"
CMD ["uvicorn","service:app","--host","0.0.0.0","--port","8000","--workers","1","--limit-concurrency","8","--timeout-keep-alive","5","--no-access-log"]

