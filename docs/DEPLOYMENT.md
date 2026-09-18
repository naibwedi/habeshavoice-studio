# Deployment

HabeshaVoice Studio runs as a Next.js app on Vercel. A private Vercel Blob store holds recordings and transcript JSON. A separate GPU service runs Ethio-ASR. The Vercel app and speech service communicate over HTTPS with a server-only bearer key.

## Vercel web app

1. Import this GitHub repository into Vercel as a **Next.js** project. Keep the root directory at the repository root and the build command as `npm run build`.
2. Create a **private** Blob store from the project's Storage tab and connect it to the project. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.
3. Add `STUDIO_PASSWORD` and a random `SESSION_SECRET` of at least 32 characters as encrypted production environment variables. The password protects the single-owner studio; do not reuse an existing account password.
4. Add the HTTPS `ASR_ENDPOINT` ending in `/v1/transcribe` and the matching `ASR_API_KEY` as server-only production variables.
5. Deploy, sign in, and verify record/upload, transcription, playback, editing, export, and deletion.

Browser uploads go directly to the private Blob store through an authenticated upload-token route. This avoids Vercel's 4.5 MB Function request limit. The server fetches the private recording for inference, then saves the transcript. A fresh Vercel library is created; data from another host is not imported automatically.

Keep the Blob token, studio password, session secret, and speech key out of client code and Git. Rotate the session secret when revoking all active sessions. A service worker caches only the offline fallback and public assets.

## Speech service

The `inference/` directory contains an authenticated FastAPI service that decodes audio with FFmpeg and runs the [Ethio-ASR multilingual model](https://huggingface.co/badrex/Ethio-ASR-multilingual-600M). Deploy it on a Linux GPU host. The included Modal wrapper is one option:

```sh
modal deploy inference/modal_app.py
```

For an isolated Vercel speech endpoint, create a Modal Secret named `habeshavoice-asr-vercel` containing the same `ASR_API_KEY` configured in Vercel, set `HABESHA_ASR_DEPLOYMENT=habeshavoice-asr-vercel` when running the deploy command, and use its printed URL. The wrapper uses an L4 GPU, scales to zero, and caches model downloads in a persistent volume. Check `/healthz` before routing app traffic. The first request after idle can be slower while the GPU starts.

For a self-hosted GPU service, use the `inference/Dockerfile` and an HTTPS reverse proxy. Restrict request size and connection count, and keep the API key in server-side secrets.

## Verification

Run `npm run typecheck`, `npm test`, and `npm run build` before deploying. Test a real short recording in both languages through the public Vercel URL. Review transcripts against the audio; names and dialectal speech may require correction. Monitor Vercel function errors and speech-service logs, and verify deletion removes both the transcript and its audio.

The app currently uses a synchronous inference request. Capacity, long-running audio, backups, and dialect accuracy should be measured before opening the studio to many users.
