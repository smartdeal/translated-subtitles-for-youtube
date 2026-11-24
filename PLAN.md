# Project plan

Last updated: 2026-11-25

<!-- OVERVIEW: keep this block under ~30 lines. Agents read only this part first. -->
## Overview
Goal: Chrome extension that shows translated (en->ru, any pair later) subtitles on YouTube.
Current milestone: M5 Shorts (spike done)

| ID | Milestone | Status | One line |
|----|-----------|--------|----------|
| M0 | Spike | done | Scaffold; prove Translator API in extension and caption track access |
| M1 | MVP | done | Captions in, translate, overlay, player button |
| M2 | Settings + cache | done | Popup settings; per-video cache |
| M3 | Polish | done | SPA navigation, errors, model download progress |
| M4 | Auto language | done | From = Auto (video's spoken language); skip videos already in target language |
| M5 | Shorts | in progress | Same subtitles on `/shorts/` |

Sections below: Goal, Scope, Architecture, Milestones (`### M<n>:`), Risks, Ideas, Plan changes.
<!-- END OVERVIEW -->

## Goal
A working daily tool: watch English YouTube videos with Russian subtitles (original + translation). Built so it can go public and support any language pair later.

## Scope
- In: `youtube.com/watch`; existing YouTube captions (incl. auto-generated); Chrome built-in Translator API; dual-line or translation-only display; player-bar toggle; popup settings (target language, display mode, font size); per-video cache.
- In (M5): `youtube.com/shorts/`.
- Out (not now): speech-to-text, other engines, live streams, embedded players, Web Store release, mobile.

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

### M5: Shorts
- [x] Spike in Chrome (results in STATE "Decisions"). Embeds dropped from M5: Translator API is blocked there.
- [ ] `utils/page.ts`: page kind (`watch` | `shorts`), video id from URL, player selector per kind (`#movie_player` / `#shorts-player`; on Shorts a hidden 0x0 `#movie_player` also exists). Unit tests. `youtube.content.ts` and the MAIN world use it.
- [ ] Captions on Shorts: direct json3 fetch returns an empty body; if empty, call `player.setOption('captions','track',{languageCode})` so the player sends its own request (with `pot`), take the intercepted copy, then restore the user's CC state. Test for the empty-body path.
- [ ] Shorts button: before `#closed-captioning-button-container` in the active `ytd-shorts-player-controls #right-controls`; own style to match the 48 px round buttons.
- [ ] Shorts overlay: inside `#shorts-player`, clear of the bottom title/channel overlay; native captions hidden. Restart on swipe (`yt-navigate-finish`, same `<video>` reused).
- [ ] Live stream (`videoDetails.isLive`): status "Live streams are not supported yet" instead of a broken session.
- [ ] Check in Chrome: a Short with captions, swipe to next and back, a Short without captions; `/watch` still works.

Retro: TBD

## Risks / unknowns
- Caption URLs may need a proof-of-origin token when logged out (direct fetch worked logged in; XHR intercept fallback proven).
- YouTube SPA and DOM changes break selectors.
- Sequential translation is slow on long tracks.
- Shorts UI changes more often than the watch page; selectors there are fragile.

## Ideas / later
- Speech-to-text for videos without captions.
- DeepL / LLM translation engines.
- Live streams (captions are a moving window, not a full track).
- Embedded players (`/embed/`, youtube-nocookie): Translator API blocked by Permissions-Policy in normal embeds (2026-11-25 spike). Possible route: translate in an extension offscreen document (`offscreen` permission); untested whether Translator works there and whether a model download can start without a page gesture.
- Chrome Web Store release.

## Plan changes
<!-- newest first, one line each: YYYY-MM-DD: what changed; why. Keep ~20, move older to docs/plan/changes-archive.md -->
- 2026-11-25: M5 cut to Shorts; spike showed Translator API blocked in normal embeds (Permissions-Policy, content scripts do not bypass). Embeds back to Ideas with the offscreen idea.
- 2026-11-25: M5 Shorts + embeds picked from Ideas; same caption pipeline, medium size. Live streams stay in Ideas (different caption model).
- 2026-11-24: M4 added (auto source language, skip same-language videos); user saw a Russian video translated en->ru from YouTube's auto-dub English track.
- 2026-11-24: SPA navigation moved from M3 into M1; without it old subtitles stayed on the next video.
- 2026-11-14: plan created from kickoff grilling.
