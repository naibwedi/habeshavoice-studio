# Release verification

Verified locally on 17 September 2026.

- Production build: passed.
- TypeScript: passed.
- Node validation tests: 6 passed.
- Authenticated API smoke test: create, read, edit, immutable original, same-origin write protection, missing audio, missing engine response, delete: passed.
- Python inference contract tests: 11 passed, including real FFmpeg audio decode, chunk limits, temporary cleanup, authorization, silence rejection and upload limits. These use a deterministic fake model; they do not measure ASR accuracy.
- Browser workflows in Edge: 5 passed. The suite exercised save/edit/export/reload/delete, fake-device microphone capture and consent, mobile language switching, unsaved-edit protection, install manifest, and screenshots.
- Mobile width 390px: no horizontal overflow or framework overlay.
- WebMCP read-only transcript tool: schema checked; valid input returned current edited text; invalid input failed.
- Runtime npm audit: 0 vulnerabilities after updating the transitive browser mapping package.

Not validated here: GPU container build, live Omnilingual model inference, actual speech accuracy, real production traffic/load, backup/restore, or hosted inference configuration. The deployed app is private and shows real transcription as unavailable until ASR_ENDPOINT and ASR_API_KEY are configured.

