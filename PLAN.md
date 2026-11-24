# Project plan

Last updated: 2026-11-24

<!-- OVERVIEW: keep this block under ~30 lines. Agents read only this part first. -->
## Overview
Goal: Chrome extension that shows translated (en->ru, any pair later) subtitles on YouTube.
Current milestone: none (M0-M4 done; next from Ideas)

| ID | Milestone | Status | One line |
|----|-----------|--------|----------|
| M0 | Spike | done | Scaffold; prove Translator API in extension and caption track access |
| M1 | MVP | done | Captions in, translate, overlay, player button |
| M2 | Settings + cache | done | Popup settings; per-video cache |
| M3 | Polish | done | SPA navigation, errors, model download progress |
| M4 | Auto language | done | From = Auto (video's spoken language); skip videos already in target language |

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

Retro: WXT treats every file in `entrypoints/` as an entrypoint (rule added to AGENTS.md). Test clicks by element ref, not screenshot coordinates: YouTube layout shifts.

### M1: MVP
- [x] Caption source module (MAIN world: captionTracks + json3 fetch, XHR fallback; parse cues; merge ASR segments).
- [x] `Translator` interface + Chrome built-in impl.
- [x] Translate-ahead scheduler.
- [x] Overlay synced to playback (dual-line).
- [x] Player-bar toggle button.

Retro: `git rm` of the last file in a dir deletes the dir; re-create before writing. Default branch is `master`.

### M2: Settings + cache
- [x] Popup: target language, display mode (dual / translation only), font size.
- [x] Per-video cache in `chrome.storage.local`.

Retro: extension popup and chrome:// pages are not reachable by browser automation; popup checks are manual.

### M3: Polish
- [x] Handle YouTube SPA navigation between videos (restart on `yt-navigate-finish`, done in M1).
- [x] Error states: no captions (lists available languages), unsupported/same pair, API unavailable, caption timeout, repeated translation failures.
- [x] Model download progress indicator.

Retro: TBD

### M4: Auto language
- [x] Detect spoken language: original (non-dubbed) audio track in `streamingData.adaptiveFormats[].audioTrack`, else single ASR track; else ask user to set From.
- [x] Settings: `sourceLanguage: 'auto'` (new default); popup option "Auto (video language)".
- [x] Translator per language pair, created on demand; new pair without a click -> ask for a click.
- [x] Spoken language == To -> note "already in <language>", no translation.
- [x] Player button: SVG icon + language badge (user found the text button ugly).

Retro: TBD

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
- 2026-11-24: M4 added (auto source language, skip same-language videos); user saw a Russian video translated en->ru from YouTube's auto-dub English track.
- 2026-11-24: SPA navigation moved from M3 into M1; without it old subtitles stayed on the next video.
- 2026-11-14: plan created from kickoff grilling.
