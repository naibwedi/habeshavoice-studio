# Security

Report suspected vulnerabilities privately to the repository owner.

The trusted Sites dispatcher supplies identity. Every transcript and audio endpoint checks ownership. Browser writes reject foreign origins. Sensitive responses are non-cacheable. Audio is kept in private R2 and served only after an ownership check.

The inference secret stays on the server. The private inference service requires a bearer secret with at least 32 characters before multipart parsing. Upload bytes and decoded duration are bounded. FFmpeg runs without a shell and with restricted input protocols/formats. Temporary files are removed after requests. Transcript content is rendered as text, not HTML.

The single-process model lock returns 429 for excess concurrent work. There is no persistent queue. Model compute is not cancelled when a caller times out. D1/R2 deletion is retryable, not a distributed transaction.

Do not self-host this Worker without replacing or preserving the trusted authentication boundary. Never accept user-supplied identity headers. Before public access, establish monitoring, costs, backup/restore, retention and abuse controls.

Illustrative samples and Python test doubles are not production ASR paths.

