# Verification

The Vercel migration was checked with `npm run typecheck`, `npm test`, and `npm run build`. The Next.js build includes the sign-in page, private upload route, transcription route, and transcript library routes.

The speech service was separately exercised with a public four-second Tigrinya audio sample. It returned a transcript in about one second while warm. A cold-start health check took about 19 seconds after model weights were cached. These measurements do not establish accuracy for a specific speaker or dialect.

Before treating a Vercel deployment as operational, verify the production environment variables and private Blob connection, then complete a browser flow: sign in, record or upload, transcribe, play the saved audio, edit and export, sign out, and delete. Check the resulting deployment and function logs.

Accuracy still requires native-speaker review of representative Tigrinya and Amharic recordings.
