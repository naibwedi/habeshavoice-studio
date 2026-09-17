# Deployment

## Web application

This app uses private Sites hosting, DB (D1) and BUCKET (R2). Sites handles identity. Publish the whole server-backed build, not only static assets. Run npm run build; deployable output is in dist/. Migrations are in drizzle/ and must be applied during deployment, never at request time.

The checked-in hosting project ID identifies this app. Create a new Site identity when forking to another owner.

## Inference

Model weights and GPU memory do not fit in a Cloudflare Worker. Deploy the separate service on a Linux inference host:

~~~sh
cd inference
docker build -t habeshavoice-inference .
docker run --gpus all --env-file .env -p 127.0.0.1:8000:8000 habeshavoice-inference
~~~

Copy .env.example to .env and replace the placeholder with a random secret of at least 32 characters. Default model: omniASR_LLM_300M. The model card reports roughly 5 GiB inference VRAM in its benchmark configuration; reserve headroom and measure on your hardware.

The Dockerfile is a starting point. Build and smoke-test the exact torch/fairseq2/CUDA combination on the target GPU host. This release does not claim a successful GPU container build or real-model inference run. ASR_DEVICE=cpu is supported in code but may exceed the app's three-minute request timeout.

Use an HTTPS reverse proxy, request-body and connection limits, adequate temporary disk, and server-side secret storage. Do not log authorization headers or audio/transcript payloads.

GET /healthz returns readiness. POST /v1/transcribe requires bearer auth and multipart audio + language (ti or am). API documentation endpoints are disabled in production.

## App secrets

Set via the hosting platform:
- ASR_ENDPOINT: full HTTPS URL ending in /v1/transcribe.
- ASR_API_KEY: matching random secret.

With either missing, demo/library stay available and transcription returns a clear 503. Readiness in the UI indicates configuration, not a continuous upstream health check.

## Production acceptance still required

- Build and run the GPU image on the intended host.
- Verify real speech through upload, inference, playback, edits, exports and deletion for both languages.
- Native-speaker review, held-out WER/CER and correction-time benchmarks.
- Load, timeout and network interruption tests; monitoring and alerting.
- Backups/restore, retention, secret rotation and incident ownership.
- Review exact model/dependency licenses for your business use.
- Preserve private access until audience and operating costs are settled.

The current service has no persistent queue or model-compute cancellation after a disconnected request. Scale and price it before expanding access.

