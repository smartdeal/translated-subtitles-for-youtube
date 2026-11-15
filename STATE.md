# Project state

Last updated: 2026-11-15

## Status
M0 spike in progress on `feat/m0-spike`.

## Current focus
M0: spike the two main risks (Translator API in content script; getting the caption track).

## Next steps
- User loads unpacked `.output/chrome-mv3`; then run spike on a YouTube video (red "TP spike" button, `[TP]` console logs).
- Spike: Translator API (en->ru) callable from a content script on youtube.com.
- Spike: get the caption track of a `/watch` video (capture player's own timedtext response; fallback: caption DOM).

## Recent changes
<!-- newest first, keep ~10 -->
- 2026-11-15: WXT 0.21.5 + TS 5.9.3 + Vitest 5.1.0 scaffold; spike scripts (isolated + MAIN world) build.
- 2026-11-14: project files created after kickoff grilling.

## Decisions
<!-- decision: reason -->
- Chrome built-in Translator API first: free, private, no key; engine behind an interface for DeepL/LLM later.
- WXT + TypeScript: MV3 and hot reload out of the box; easy Web Store release later.
- Translate ahead from playback position + cache per video in `chrome.storage.local`: API is sequential; seek/rewatch stay instant.
- TypeScript 5.9 (not 7.x): WXT peer range is >=5.4; TS 7 native compiler untested with WXT tooling.
- MVP covers `youtube.com/watch` only: Shorts/live handle captions differently.

## Open questions / blockers
- Is `Translator` available in content scripts (isolated world)? Docs silent. Fallback: main world or offscreen document.
- Do direct `timedtext` fetches need a proof-of-origin token now? Expect yes.
