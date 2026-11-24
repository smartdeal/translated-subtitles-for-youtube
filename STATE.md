# Project state

Last updated: 2026-11-24

## Status
All planned milestones (M0-M3) done; M3 on `feat/m3-polish`, not merged. Daily use + pick next ideas.

## Current focus
Use it daily; collect issues. Pick the next item from PLAN.md "Ideas / later".

## Next steps
- Choose next idea (e.g. DeepL/LLM engine, Shorts/live, Web Store release) and add it as M4 in PLAN.md.

## Recent changes
<!-- newest first, keep ~10 -->
- 2026-11-24: M3 checked in Chrome: "No English subtitles. This video has: Russian." shown and hidden after 8 s, button stays on; `en-US` ASR-only video translates.
- 2026-11-24: M3 code: clear error texts (lists available caption languages), 10 s caption timeout, warning after 3 failed translations, same-language check. 21 unit tests.
- 2026-11-24: M2 checked in Chrome: cache hit shows translation in 1 frame (uncached 150-1650 ms); popup checked by user (font, mode, language switch).
- 2026-11-24: M2 code: popup (languages, display, font size) in `sync:settings`, LRU per-video cache (50 videos) in storage.local. 17 unit tests.
- 2026-11-24: M1 checked in Chrome: dual lines synced, native CC hidden, seek, SPA switch to another video, toggle off.
- 2026-11-24: M1 MVP code: captions parse/merge, TranslationQueue, Chrome translator, overlay, player button, SPA restart. 10 unit tests.
- 2026-11-24: M0 spike results (Chrome 157, logged-in account): Translator en->ru works in isolated content script; direct json3 caption fetch works without `pot`; player's own caption XHR is interceptable in MAIN world.
- 2026-11-15: WXT 0.21.5 + TS 5.9.3 + Vitest 5.1.0 scaffold; spike scripts (isolated + MAIN world) build.
- 2026-11-14: project files created after kickoff grilling.

## Decisions
<!-- decision: reason -->
- Chrome built-in Translator API first: free, private, no key; engine behind an interface for DeepL/LLM later.
- WXT + TypeScript: MV3 and hot reload out of the box; easy Web Store release later.
- Translate ahead from playback position + cache per video in `chrome.storage.local`: API is sequential; seek/rewatch stay instant.
- TypeScript 5.9 (not 7.x): WXT peer range is >=5.4; TS 7 native compiler untested with WXT tooling.
- Translator runs in the isolated content script: works there; first `create()` needs the click gesture (model download ~8.5 s once), later calls need none. ~40 ms per line sequential, ~13 s for a 315-line talk.
- Caption source: MAIN-world script reads `captionTracks` from `#movie_player.getPlayerResponse()` and fetches `baseUrl&fmt=json3`; fallback: intercept player's own `/api/timedtext` XHR (it fires when CC is on). Pass cues to isolated world via `window.postMessage`.
- Cache = map original line -> translation per video+language pair (survives line-split changes); saved at most every 5 s and on stop.
- Language change in popup turns the button off: a new pair may need a model download, which needs a click.
- MVP covers `youtube.com/watch` only: Shorts/live handle captions differently.

## Open questions / blockers
- Direct caption fetch tested only on a logged-in Premium account; may need `pot` when logged out. Fallback (XHR intercept) is ready.
- Not seen in a real browser: 'timeout', 'fetch-failed', 'translation keeps failing', API missing (all code paths, unit-tested texts only). New download text "(one time only)" not re-seen; download progress itself was seen by user in M2.
- ASR json3 tracks are word-level segments with `"\n"` events: need grouping into readable lines.
