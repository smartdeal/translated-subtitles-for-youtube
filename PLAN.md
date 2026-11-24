# Project plan

Last updated: 2026-11-24

<!-- OVERVIEW: keep this block under ~30 lines. Agents read only this part first. -->
## Overview
Goal: Chrome extension that shows translated (en->ru, any pair later) subtitles on YouTube.
Current milestone: M1

| ID | Milestone | Status | One line |
|----|-----------|--------|----------|
| M0 | Spike | done | Scaffold; prove Translator API in extension and caption track access |
| M1 | MVP | todo | Captions in, translate, overlay, player button |
| M2 | Settings + cache | todo | Popup settings; per-video cache |
| M3 | Polish | todo | SPA navigation, errors, model download progress |

Sections below: Goal, Scope, Architecture, Milestones (`### M<n>:`), Risks, Ideas, Plan changes.
<!-- END OVERVIEW -->

## Goal
A working daily tool: watch English YouTube videos with Russian subtitles (original + translation). Built so it can go public and support any language pair later.

## Scope
- In: `youtube.com/watch`; existing YouTube captions (incl. auto-generated); Chrome built-in Translator API; dual-line or translation-only display; player-bar toggle; popup settings (target language, display mode, font size); per-video cache.
- Out (not now): speech-to-text, other engines, Shorts, live streams, embedded players, Web Store release, mobile.

## Architecture
- Content script on `youtube.com/watch`:
  - Caption source: gets the caption track (cues with start/end/text) for the current video.
  - Translation scheduler: translates cues ahead of the playback position, one request at a time.
  - Overlay: renders the active cue (original + translation) over the player, synced to `video.currentTime`.
  - Player button: on/off toggle; its click provides the user gesture for `Translator.create()`.
- `Translator` interface: `translate(text, from, to)`. First impl: Chrome built-in Translator API.
- Popup: settings saved in `chrome.storage.sync`; cache in `chrome.storage.local` keyed by video id + language pair.

## Milestones
<!-- status: [ ] todo, [~] in progress, [x] done -->
### M0: Spike
- [x] Scaffold WXT + TypeScript + Vitest; lint/typecheck; fill AGENTS.md Commands/Structure.
- [x] Prove `Translator` (en->ru) works from the extension (content script, else main world/offscreen).
- [x] Prove we can get the caption track of a `/watch` video (player's own response, else caption DOM).

Retro: TBD

### M1: MVP
- [ ] Caption source module (MAIN world: captionTracks + json3 fetch, XHR fallback; parse cues; merge ASR segments).
- [ ] `Translator` interface + Chrome built-in impl.
- [ ] Translate-ahead scheduler.
- [ ] Overlay synced to playback (dual-line).
- [ ] Player-bar toggle button.

### M2: Settings + cache
- [ ] Popup: target language, display mode (dual / translation only), font size.
- [ ] Per-video cache in `chrome.storage.local`.

### M3: Polish
- [ ] Handle YouTube SPA navigation between videos.
- [ ] Error states: no captions, unsupported language pair, API unavailable.
- [ ] Model download progress indicator.

## Risks / unknowns
- Caption URLs may need a proof-of-origin token when logged out (direct fetch worked logged in; XHR intercept fallback proven).
- YouTube SPA and DOM changes break selectors.
- Sequential translation is slow on long tracks.

## Ideas / later
- Speech-to-text for videos without captions.
- DeepL / LLM translation engines.
- Shorts, live streams, embedded players.
- Chrome Web Store release.

## Plan changes
<!-- newest first, one line each: YYYY-MM-DD: what changed; why. Keep ~20, move older to docs/plan/changes-archive.md -->
- 2026-11-14: plan created from kickoff grilling.
