# Pixelmorphic Code Studio v52

Prepared for Harsh Saxena · 13 November 2026

This is a targeted upgrade for the v51 Code Studio in the supplied ZIP. It adds a proper editor, a clearer workspace, and a bounded plan → build → check → review workflow. It reuses your configured model provider. It does not install a new AI model or guarantee the quality of Claude, Cursor, Lovable, Replit or Emergent.

## Install on your current Windows project

1. Download `Pixelmorphic_CodeStudio_v52.zip` into Downloads.
2. In the terminal currently running the site, press **Ctrl+C** to stop that server. There is no need to stop every Node process on your computer.
3. Open PowerShell and run the following block. It extracts the update into its own folder, validates compatibility and syntax, backs up each changed file, then installs.

```powershell
$ErrorActionPreference = "Stop"
$proj = "C:\Users\harsh\Downloads\Pixelmorphic_Samurai_Integration (2)\pixelmorphic-samurai"
$zip = Get-ChildItem "$env:USERPROFILE\Downloads" -Filter "Pixelmorphic_CodeStudio_v52*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $zip) { throw "Download Pixelmorphic_CodeStudio_v52.zip into Downloads first." }
$update = Join-Path "$env:USERPROFILE\Downloads" "Pixelmorphic_CodeStudio_v52_Update"
Expand-Archive -LiteralPath $zip.FullName -DestinationPath $update -Force
node "$update\install.mjs" --project "$proj"
if ($LASTEXITCODE -ne 0) { throw "Installation stopped. Read the message above; do not run the old restore script." }
Set-Location -LiteralPath $proj
npm.cmd start
```

4. Open **http://127.0.0.1:3000/#code** and press **Ctrl+Shift+R**. The workspace header should say **V52**.
5. Click **Open working demo · no API call**. Test the chart periods, customer search and theme. Then try a build with your own provider.

Use `install.mjs` for this update. Running `Pixelmorphic_Restore_Clean_Site.mjs` from the old pack would reinstall v51 files.

Node.js **20 or newer** is required. No `npm install`, external editor CDN, new package dependency, or `.env` replacement is needed.

To check compatibility without installing:

```powershell
node "$update\install.mjs" --project "$proj" --check
```

## What changed

| Area | v52 behavior |
| --- | --- |
| Workspace | Charcoal desk layout; assistant, file list, editor and preview; code/split/preview views; focus mode and expanded workspace; separate mobile panes. |
| Editor | Bundled CodeMirror, syntax highlighting, line numbers, indentation, bracket/tag completion, undo/redo, find/replace and keyboard shortcuts. Plain-text fallback if editor initialization fails. |
| Projects | Multiple browser-local projects, rename/remove, saved prompt drafts, persistent project instructions, text-file import, source ZIP export and JSON backup/import. |
| Existing v51 app | Its latest HTML is imported on first launch when no v52 project exists. The original v51 browser record is retained. Use the same browser and exact localhost address. |
| Understanding | Structured requirements and design plan; Hindi/Hinglish instructions; project brief, recent conversation and complete current files are included within explicit limits. |
| Generation | Changes are staged for comparison and review. Unchanged files survive. AI cannot implicitly delete a source file. |
| Checks | HTML document structure, script parsing, JSON parsing and local script/style/image references. Results are labeled static checks, not verified runtime correctness. |
| Recovery | Checkpoints before applying AI changes, import, rename/delete and restore. Up to 12 versions within a bounded storage budget. |
| Provider handling | Actual model ID is visible. Bounded requests, cancellation, output-limit detection, duplicate request protection, no automatic retries or silent model switching. |
| Preview | Isolated script-enabled iframe without same-origin permission; runtime errors and console; explicit Run/Stop; desktop/tablet/mobile widths; a separate preview storage bridge. |
| Loop handling | Preview scripts are parsed and instrumented to interrupt common long-running loops. Original exported source is not instrumented. |

## Build profiles and cost

The final product names are **Morphic Code**, **Morphic Code Pro** and **Morphic Code Ultra**.

- **Morphic Code:** one generation request.
- **Pro / Ultra:** up to one planning request and one generation request. An existing plan is reused when the request is unchanged. These profiles use the same workflow with separate engine configuration when supplied.
- **Plan:** one planning request, with no file replacement.
- **Ask AI to fix:** for a staged proposal with errors, this explicitly starts another request against the proposed files; your current project remains intact. For the current project, it prepares a repair prompt for you to send.
- No provider fallback or automatic retry is performed. A cancellation aborts the connection and prevents later stages, but a provider may still bill a request it has already processed.

Engine selection uses these settings in descending precedence:

| Setting | Purpose |
| --- | --- |
| `CODE_STUDIO_MODEL_FAST`, `_PRO`, `_ULTRA` | Optional engine for the selected Code Studio profile. |
| `CODE_STUDIO_MODEL` | Optional common engine for Code Studio. |
| `AI_MODEL_FAST` / `AI_MODEL_ULTRA` | Existing corresponding profile engine, if configured. |
| `AI_MODEL` or `MODEL` | Existing common engine. No hard-coded model fallback. |

The existing `AI_API_KEY`, `FAL_KEY`, `OPENROUTER_API_KEY`, `SAMURAI_API_KEY` or `API_KEY` is reused. `CODE_STUDIO_API_KEY` overrides it for this workspace. No arbitrary environment variable is scanned for a credential.

The endpoint uses `CODE_STUDIO_BASE_URL`, then existing `AI_BASE_URL`, `AI_API_URL`, `OPENROUTER_BASE_URL` or `BASE_URL`. Without an explicit endpoint, `FAL_KEY` selects the fal OpenRouter route; otherwise it uses OpenRouter. fal endpoints use `Key`, other endpoints use `Bearer`. `CODE_STUDIO_AUTH_SCHEME` can override that choice. Credentials stay on the server.

Optional controls, only if your provider supports them:

```dotenv
# Defaults: 8192 output tokens, 120000 milliseconds per provider call.
CODE_STUDIO_MAX_TOKENS=8192
CODE_STUDIO_TIMEOUT_MS=120000
```

Do not copy placeholder model names or keys into your working `.env`. If the current provider does not support the selected engine or output budget, the build stops with an error and preserves your project.

## Everyday workflow

1. Write the outcome, audience, required interactions and visual direction. Add permanent constraints under **Brief**.
2. Use **Plan** when you want to inspect the requirements first, or **Build** to proceed through the selected workflow.
3. Review the proposed files with **Compare**. Run the proposed preview if desired. Inspect **Checks** and **Console**.
4. Apply the changes. Run the app and test each requested behavior, including empty inputs and narrow widths.
5. Export a JSON backup and source ZIP when you reach a useful milestone.

**Shortcuts:** Ctrl+Enter in the prompt sends a build; Enter adds a newline. Ctrl+Enter in the editor runs preview. Ctrl+S saves a checkpoint. Ctrl+F finds; Ctrl+H replaces. Editor undo/redo uses the usual shortcuts.

Project limits are 24 text files, 160 KB per file, 240 KB combined source, and 20 locally saved projects. Requests above the limit are rejected rather than silently truncated. Up to 50 conversation entries and 12 bounded checkpoints are retained. The preview has its own small localStorage-compatible bridge; it does not have access to the parent workspace’s storage.

## Current scope and limits

This release builds and previews **HTML, CSS and browser JavaScript projects**. It also edits/exports JSON, SVG, Markdown and TXT files. It does not provide an npm/container runtime, JSX/TypeScript transpilation, backend execution, real authentication/payments, hosted databases, Git integration or public deployment. Those require a separate authenticated execution architecture.

The preview blocks external scripts, styles, network requests, workers, dynamic evaluation, popups and forms that navigate. It supports local classic script and stylesheet files; module imports require a bundler and are not supported. Use inline SVG for dependable charts and illustrations. Multiple HTML files can be exported, but `index.html` is the preview entry point. Normal multi-page navigation is tested after export.

Checks are deliberately limited: they do not prove semantic correctness, fully validate CSS/HTML, verify accessibility, test every interaction or measure design quality. Loop instrumentation is a best-effort guard for common mistakes, not a guarantee against every CPU or memory exhaustion pattern. Avoid running unknown hostile code.

**The v52 API is intentionally local-only:** requests must use a localhost Host and same-origin browser request. Public hosting requires real user authentication, per-user storage, quotas and a separate execution sandbox. Existing unrelated API routes are not hardened by this patch.

Browser data belongs to the exact origin. `localhost:3000` and `127.0.0.1:3000` have different storage. Clearing site data removes local projects. Export backups rather than treating browser storage as a permanent backup.

## Installation safeguards

- Only the explicit project path is used. Other Downloads folders and other projects are not scanned.
- Compatibility anchors, payload SHA-256 checksums and JavaScript syntax checks run before application files are changed.
- Existing files are backed up under `backups/code-studio-v52-<timestamp>`.
- Writes use same-directory temporary files and replacement; caught write failures trigger restoration of changes made by that attempt.
- Re-running the same update is idempotent.
- Symlink targets and unsafe relative paths are refused.
- `.env`, `server.mjs`, `package.json`, research modules, general conversation records and browser data are not replaced by the installer.
- Existing Code Studio mounting functions delegate to v52. The v51 mounting function remains as a fallback if v52 cannot initialize.
- The backend module loads dynamically through the existing general-chat route, so a module-load failure returns an error instead of a new startup import crashing the entire server.

## Roll back

Stop the server with Ctrl+C, then run:

```powershell
$proj = "C:\Users\harsh\Downloads\Pixelmorphic_Samurai_Integration (2)\pixelmorphic-samurai"
$update = Join-Path "$env:USERPROFILE\Downloads" "Pixelmorphic_CodeStudio_v52_Update"
node "$update\rollback.mjs" --project "$proj"
if ($LASTEXITCODE -ne 0) { throw "Rollback stopped to protect files. Read the message above." }
Set-Location -LiteralPath $proj
npm.cmd start
```

Hard-refresh the browser. Rollback restores the latest active backup, preserves browser project data, and refuses to discard file edits made after installation. If there are later edits, use the reported backup path for a manual comparison. Export v52 projects before returning to v51 if you need their files immediately.

If an interrupted machine shutdown leaves `.pixelmorphic-v52-install.lock`, first verify that no installer is running. Remove that one lock file, then use rollback. Do not delete the backup folder.

## Troubleshooting

| Symptom | Next action |
| --- | --- |
| Header still shows the old editor | Restart the correct project; press Ctrl+Shift+R; make sure the old restore script was not run afterward. |
| Installation stopped at compatibility check | Keep the existing site. The on-disk files differ from this v51 baseline; provide the current files named in the error for a targeted patch. |
| Backend unavailable | Restart the server. Check that the terminal reports the intended project path; inspect `/api/general-chat?studio52=1`. |
| Model/key not configured | Open Settings to see actual engine IDs. Correct the existing `.env`, then restart. Never paste API keys into a prompt. |
| Provider 401, 403, 404 or 429 | Correct the key/auth/model/endpoint or check the provider balance. The update does not retry silently. |
| Incomplete model response | Ask for a smaller change, choose a capable configured engine, or increase the output budget if supported. Existing source remains intact. |
| Preview will not run | Open Checks. Resolve syntax, incomplete HTML or missing file errors. For a staged build, Ask AI to fix can repair that proposal. |
| Preview is unresponsive | Use Stop; fix the reported loop. Close/reload the browser tab if code exhausts browser resources despite the guards. |
| Save warning | Export a JSON backup before closing. Check browser storage settings and available disk space. |

The main server and original site shell were not included in the attachment. The update was checked against an integration fixture using the actual supplied v51 modules and UI. See `TEST_REPORT.md` for exact coverage and unverified items.

## Package contents

`install.mjs`, `rollback.mjs`, a checksummed `payload/`, `tests/`, `examples/pulse-dashboard/`, this guide, `INSTALL_POWERSHELL.txt`, `TEST_REPORT.md` and third-party license notices. The runtime files are readable source; no build step is required on your computer.

Technical references: [CodeMirror](https://codemirror.net/5/), [Acorn](https://github.com/acornjs/acorn), [iframe sandbox behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe). Bundled editor/parser versions are pinned and their MIT licenses are included.
