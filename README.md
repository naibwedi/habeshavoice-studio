# HabeshaVoice Studio

**A private speech-to-text workspace for Tigrinya and Amharic.** Record or upload audio, review the transcript alongside the original recording, make corrections, and export your words.

<p align="center"><img src="docs/studio-desktop.png" alt="HabeshaVoice Studio on desktop" width="1000"></p>

## The studio

- **Capture naturally.** Record in the browser or upload an audio file, then listen before transcribing.
- **Work in your language.** Choose Tigrinya or Amharic. The speech service uses [Ethio-ASR](https://huggingface.co/badrex/Ethio-ASR-multilingual-600M).
- **Keep the original.** Edit the working transcript while retaining the first machine transcript for reference.
- **Make it useful.** Search saved sessions, copy text, download UTF-8 TXT or Markdown, or print to PDF.
- **Stay in control.** Audio uploads only after explicit consent. Recordings and transcripts remain in the private library until deleted.

Automatic speech recognition can miss dialectal words, names, and short phrases. Review important transcripts against the recording.

## Architecture

The browser app handles capture, review, editing, and export. Authenticated Next.js routes manage the private transcript library and audio storage in Vercel Blob. A separate FastAPI service decodes audio and runs Ethio-ASR; its bearer credential stays on the server.

```text
Browser → web app → authenticated API → speech service
                     ├─ private transcript records
                     └─ private audio storage
```

The speech service is intentionally separate from the web deployment so the interface can run on a standard web host while inference uses GPU infrastructure.

## Run locally

Use Node.js 24 and npm. Connect a private Vercel Blob store and set the server variables in [deployment instructions](docs/DEPLOYMENT.md) before using the library or transcription. Python 3.11 and a GPU-capable Linux host are needed only if you run the inference service yourself.

```sh
npm ci
npm run dev
```

Open the URL printed by the development server. Sign in with the studio password you configured. For speech recognition, set the server-side `ASR_ENDPOINT` and `ASR_API_KEY` described in [deployment instructions](docs/DEPLOYMENT.md).

```sh
npm run typecheck
npm test
npm run build
```

## Deploy

Deploy the Next.js app to Vercel, attach a **private** Vercel Blob store, and configure the studio and speech-service secrets. The [deployment guide](docs/DEPLOYMENT.md) covers setup and verification. Keep `ASR_API_KEY` in server-side secrets; never put it in browser code or source control.

## Project notes

- [Security and privacy](SECURITY.md)
- [Verification](docs/VERIFICATION.md)
- [Speech model](https://huggingface.co/badrex/Ethio-ASR-multilingual-600M) and [research paper](https://arxiv.org/abs/2603.23654)

The application code is MIT licensed. The model and other dependencies retain their own licenses. No credentials, user recordings, or model weights belong in this repository.
