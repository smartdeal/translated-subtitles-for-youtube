# Project state

Last updated: 2026-11-14

## Status
Kickoff done; no code yet.

## Current focus
M0: spike the two main risks (Translator API in content script; getting the caption track).

## Next steps
- Scaffold WXT + TypeScript + Vitest; fill Commands in AGENTS.md.
- Spike: Translator API (en->ru) callable from a content script on youtube.com.
- Spike: get the caption track of a `/watch` video (capture player's own timedtext response; fallback: caption DOM).

## Recent changes
<!-- newest first, keep ~10 -->
- 2026-11-14: project files created after kickoff grilling.

## Decisions
<!-- decision: reason -->
- Chrome built-in Translator API first: free, private, no key; engine behind an interface for DeepL/LLM later.
- WXT + TypeScript: MV3 and hot reload out of the box; easy Web Store release later.
- Translate ahead from playback position + cache per video in `chrome.storage.local`: API is sequential; seek/rewatch stay instant.
- MVP covers `youtube.com/watch` only: Shorts/live handle captions differently.

## Open questions / blockers
- Is `Translator` available in content scripts (isolated world)? Docs silent. Fallback: main world or offscreen document.
- Do direct `timedtext` fetches need a proof-of-origin token now? Expect yes.
