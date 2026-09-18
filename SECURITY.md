# Security

Report suspected vulnerabilities privately to the repository owner.

HabeshaVoice Studio is a single-owner private workspace. A password-protected, signed, HTTP-only cookie guards the app and API. State-changing browser requests require the same origin. Use a unique studio password and a random session secret of at least 32 characters; rotate the latter to invalidate active sessions.

Recordings and transcript records live in a **private** Vercel Blob store. Browser uploads receive short-lived, authenticated upload tokens with a file-size and content-type restriction. Private audio is served only through the authenticated API. Transcription requests are bounded, and the speech-service bearer key stays server-side. Temporary upload objects are deleted when transcription fails.

The inference service requires a bearer secret before parsing multipart input. FFmpeg runs without a shell, rejects unsupported input protocols, and writes to temporary files that are removed after each request. A single-worker lock limits simultaneous inference.

Do not put studio passwords, session keys, Blob tokens, speech keys, recordings, or model weights in Git. Review Vercel and speech-service logs without recording authorization headers or audio contents. Establish backups, monitoring, and an incident process before offering access to multiple users.
