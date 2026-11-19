# Pixelmorphic AI — Samurai integration

This extends the Pixelmorphic workspace with a local Node backend configured for
`https://api.samuraiapi.io/v1`. No dependency installation is needed.

## Easiest Windows setup (no manual file editing)

1. Extract this ZIP to a folder you own.
2. Double-click **START_PIXELMORPHIC.cmd**. If Node is missing, install a supported
   LTS release from https://nodejs.org/ once, then open the launcher again.
3. Paste your Samurai key at the hidden terminal prompt and press Enter.
   Nothing will appear while you type; this is intentional. After Enter, a character-count confirmation appears (the key itself remains hidden).
4. Allow model lookup, filter the list, and select your exact model. If lookup
   is unsupported, paste the model ID from your provider dashboard.
5. Generation stays disabled unless you explicitly type **ENABLE**. Enabling it
   permits provider charges when you later click Generate in the workspace.
6. Setup writes `.env` locally, starts the server and opens the browser on Windows.
   Keep the terminal window open while you work.

Next time, use the same launcher. To change key/model/generation settings,
stop the server and double-click **CONFIGURE_API.cmd**, then start again.
The key is stored in plaintext in local `.env` for the backend, not encrypted
in a password vault. File permissions are restricted where supported. Do not
share the extracted configured folder. The supplied ZIP contains no real key.

The launcher and metadata lookup logic were unit-tested with mock responses.
The Windows double-click/browser-opening behavior has not been tested here.

## Manual setup (alternative)

1. Install Node.js 22.13 or later (a supported LTS release).
2. Extract the ZIP. Open its `pixelmorphic-samurai` folder in VS Code.
3. Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`).
4. Edit `.env` locally. Set `AI_API_KEY` to your Samurai secret key.
5. Run `npm start` in the folder's terminal.
6. Open `http://127.0.0.1:3000` in your browser. Do not double-click index.html.
7. Open **API setup → Fetch model IDs**. This tries the authenticated `/models`
   endpoint, without a generation request. If unsupported, get the exact ID from
   Samurai's dashboard/documentation.
8. Set `AI_MODEL` to that exact ID in `.env`. When ready for paid generation,
   set `AI_ENABLE_GENERATION=true`. Restart the server (Ctrl+C, then `npm start`).
9. Choose **Website starter**, write a detailed website brief, click **Plan my
   job**, review the model, tick the usage-charge acknowledgement, and generate.
10. Review the generated website in Code Studio; download the HTML if wanted.

Never put your API key in the HTML, JavaScript, chat, screenshots, or GitHub.
The `.gitignore` excludes `.env` and logs. Provider keys remain server-side.

## Implemented

- Same-origin server adapter for `/models` and `/chat/completions`.
- Key/model readiness, generation disabled by default, server-selected model.
- Single concurrent job, ten attempts per server session by default, output cap,
  bounded request/response sizes, timeout, no automatic retries or redirects.
- Request-ID deduplication for the life of this server process.
- HTML/CSS output, isolated preview, HTML download, browser-local project saving.
- Sanitized metadata logs in `logs/api.jsonl`, plus last 100 events in Account.
- Provider-reported token usage is recorded when returned. Rupee cost remains
  unknown because provider pricing has not been supplied.

## Provider compatibility is not yet verified

Public Samurai documentation could not be retrieved. This adapter assumes the
OpenAI-compatible JSON Chat Completions protocol with Bearer authentication.
No real API key was supplied, and no real generation was executed.

Some models accept `max_completion_tokens` instead of `max_tokens`; set
`AI_OUTPUT_LIMIT_FIELD` as documented by your supplier. Only text coding output
is supported here. Native Anthropic, Responses API, streaming, tool calling,
file upload, images, and video are not implemented. No model ID is guessed.
The model must return one complete HTML document and `finish_reason: stop`.
Truncated or unsupported output reports an error, not a successful website.

## Local owner testing only — not a public paid service

The server binds to `127.0.0.1`, rejects foreign Host/Origin headers, and does not
allow browser CORS access. Do not expose it through a public tunnel or proxy.
Real user authentication, persistent user isolation, payment verification,
credit reservation/settlement, a durable job queue and monetary spending limits
must be added before public Hostinger deployment. Google/Apple screens and
wallet remain placeholders. Smart Switch currently classifies work locally;
generation always uses the single configured model.

Session limits and deduplication reset on restart. A lost connection/timeout
does not prove the provider stopped or refunded a request. Review its dashboard
before starting another generation. The UI deliberately requires confirmation
before another attempt; it never retries a paid call automatically.

Logs store model, local request ID, timing, sanitized status, and selected usage
fields. They do not store keys, raw provider errors, prompts or generated HTML.
Generated files and briefs stay in this browser's local storage; treat it as one
owner's workspace, not separate customer accounts. Log rotation and durable
retention controls are still needed for production.

## Verification

Run `npm test`. Tests use an injected mock provider; they make no paid calls.
Tests cover transport, secrets, disabled generation, request validation,
deduplication, provider failures, usage and isolated preview markup.
Browser visual QA and real Samurai end-to-end execution are not verified.

Hosting purchase is not required to run this local package.

## Setup prompt fix
The terminal input now reuses one prompt session, restoring visible output after
the hidden key. A Linux pseudo-terminal test verified follow-up prompts, key
non-disclosure and disabled-by-default generation. Windows behavior and live
provider compatibility still need verification.
