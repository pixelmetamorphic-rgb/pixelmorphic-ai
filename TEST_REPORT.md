# Validation report — Code Studio v52.0.0

Date: 13 November 2026. Runtime: Linux, Node.js 24.22.1. Baseline: the actual v51 files extracted from the user-supplied ZIP. No user API key was available or used.

**38 checks passed:** 17 core/backend automated tests, 3 installer/rollback automated tests, 3 HTTP integration tests and 15 DOM interaction checks. Syntax checks and an exported ZIP byte comparison also passed.

| Group | Result | Coverage |
| --- | --- | --- |
| Core and backend | 17 passed | Safe filenames, duplicate/path traversal rejection, size limits without truncation, HTML/JS/JSON errors, missing assets, unchanged-file preservation, preview instrumentation, full context beyond the previous 24,000-character cutoff, true phase events, plan reuse, duplicate request protection, provider 401/429, malformed/truncated output, cancellation, request limits and no paid validation call. |
| Installer and rollback | 3 passed | Read-only compatibility check; install; byte-identical preservation of `.env`, main server, package settings, research files and saved storage; repeated install without another backup; exact rollback; refusal of unrecognized code; refusal to overwrite post-install edits during rollback. |
| Original v51 HTTP hooks | 3 passed | New status route loads through the supplied general/research modules; new editor asset is served even when the host static router does not know that filename; ordinary host routes and old storage behavior remain available. |
| DOM interaction | 15 passed | One mount despite duplicate v51 script copies; draft survives periodic legacy check; no-cost demo; generated preview chart/search/theme/storage bridge; loop interruption; editor selection; plan/build/stage/compare/apply; checkpoint creation; invalid proposal rejection and repair; failure/cancel recovery; ZIP/JSON export; navigation and data preservation; mobile-pane switching; no uncaught DOM exceptions. |

The source ZIP exported by the workspace was opened with Python's ZIP reader, passed CRC validation, and matched all three demo source files byte-for-byte.

The test provider was a deterministic local mock. The planner/generator protocol, token accounting display and error paths were exercised. These tests do **not** measure the actual model's intelligence, output aesthetics, latency, billing accuracy or provider compatibility for every configured engine.

## Unverified items

- A full Chromium visual/interaction run could not be completed. The local browser process was blocked by the runtime environment; the remote browser could not reach the local fixture. JSDOM tests check DOM behavior and generated script execution, not rendered layout, genuine iframe-origin enforcement or real browser persistence behavior.
- Windows PowerShell and Windows file replacement were not executed on the user's computer. The installer uses Node's cross-platform path/file APIs, structured process arguments and no extra packages.
- The user's complete `server.mjs`, original `public/index.html`, package dependencies and full on-disk project were absent from the attachment. A representative host fixture was used around the real supplied modules. The installer refuses unknown v51 anchors before making changes.
- JavaScript parsing does not prove runtime correctness. Loop guards cover common loops; they are not a complete hostile-code containment or memory-exhaustion solution.

## Repeatable checks included in this ZIP

From the extracted update folder, with Node 20+:

```powershell
node --test tests/core.test.mjs tests/backend.test.mjs
node install.mjs --project "C:\path\to\pixelmorphic-samurai" --check
```

The included backend tests only use a local mock HTTP provider with a dummy key. They do not contact a paid AI service. The installer and DOM integration test fixtures were development-only because they depend on the separately supplied v51 baseline and test dependencies.

## First check on the user's actual setup

1. Confirm the header says V52 after restart and hard refresh.
2. Open the working demo; test 7D/30D/1Y, search, theme, source editor and preview width controls.
3. Make a small edit, save a checkpoint, export JSON, and refresh to confirm local saving.
4. Use one small model request, compare its proposal, apply it and test it.
5. Use rollback if the host integration behaves differently from the fixture; the original files and old browser record remain available.
