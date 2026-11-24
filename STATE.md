# Project state

Last updated: 2026-11-24

## Status
M1 MVP done and checked in Chrome on `feat/m1-mvp`; M2 next.

## Current focus
M2: popup settings + per-video cache.

## Next steps
- M2: popup settings (target language, display mode, font size) in `chrome.storage.sync`; `DEFAULT_SETTINGS` is the only place with language codes now.
- M2: per-video translation cache in `chrome.storage.local`.

## Recent changes
<!-- newest first, keep ~10 -->
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
- MVP covers `youtube.com/watch` only: Shorts/live handle captions differently.

## Open questions / blockers
- Direct caption fetch tested only on a logged-in Premium account; may need `pot` when logged out. Fallback (XHR intercept) is ready.
- Error status for videos without English subtitles not yet seen in a real browser (code path only).
- ASR json3 tracks are word-level segments with `"\n"` events: need grouping into readable lines.
