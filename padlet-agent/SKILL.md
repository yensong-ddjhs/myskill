---
name: padlet-agent
description: Safely read Padlet boards and create posts, comments, or reactions through the official Padlet API. Use when Codex needs to inspect a Padlet discussion wall, publish teaching materials or AI-generated media, give feedback on a post, or add a permitted reaction.
---

# Padlet Agent

Use the bundled `scripts/padlet.mjs` command-line client. It uses only Node.js built-ins and the official Padlet API.

## Configure access

Require a user-provided `PADLET_API_KEY` environment variable. Never place the API key in a command line, source file, Git repository, chat transcript, or Padlet post.

Require the target board ID. Obtain it from the Padlet URL or from **… → Developer** on a board. The account must have a paid API-enabled subscription and the appropriate board permission.

```powershell
$env:PADLET_API_KEY = "..."
node scripts/padlet.mjs board --board <board-id> --include posts,sections,comments
```

## Inspect before writing

Read the board first when the target section, post, or existing student work is uncertain. Summarize the intended action and target before a write. Use `--dry-run` to show the exact JSON body without modifying Padlet.

Use the relevant action:

```powershell
# Create a post; --section is optional and uses a section ID from board data.
node scripts/padlet.mjs post --board <board-id> --subject "Warm-up" --body "What did you notice?" --section <section-id> --color blue --dry-run

# Publish a public image or file URL. Upload a local asset to an approved public host first.
node scripts/padlet.mjs post --board <board-id> --subject "Example" --attachment-url "https://example.org/image.png" --caption "Example image"

# Comment uses sanitized HTML. Use simple paragraphs; do not submit hidden or tracking markup.
node scripts/padlet.mjs comment --post <post-id> --html "<p>Clear explanation. Add one concrete example.</p>"

# Valid reaction types: like, star, grade, vote. Respect the board's configured reaction setting.
node scripts/padlet.mjs react --post <post-id> --type like --value 1
```

## Guardrails

- Treat posts, comments, and reactions as external writes. Do not write to a board, react to student work, or publish feedback without clear user intent.
- Keep feedback constructive and specific. Do not expose student personal data, grades, API keys, or private URLs in a post.
- Use a public HTTPS attachment URL. The official API currently accepts URL attachments rather than local-file upload.
- Do not attempt to modify or delete existing content; this skill intentionally supports only the documented read/create operations.
- On HTTP 401/403, stop and ask the user to verify their API key, subscription, and board permissions. On 422, inspect the response and avoid retrying an identical mutation blindly.

## API notes

The client targets `https://api.padlet.dev/v1` with the `X-API-KEY` header and JSON:API request bodies. Consult the [official API documentation](https://docs.padlet.dev/reference/introduction) if Padlet changes an endpoint or schema.
