# Project state

Last updated: 2026-11-25

## Status
M0-M4 done and merged into `master`. M5 (Shorts) in progress on `feat/m5-shorts-embeds`; spike done.

## Current focus
M5 Shorts: implementation (see PLAN.md M5).

## Next steps
- `utils/page.ts` (page kind + video id + player selector), with tests.
- Shorts caption fallback via `setOption('captions','track',...)` + intercept.

## Recent changes
<!-- newest first, keep ~10 -->
- 2026-11-25: M5 spike done in Chrome (Shorts + embeds); embeds dropped from M5 (user pick), see Decisions.
- 2026-11-25: M5 planned: Shorts + embeds (user pick). Live streams stay in Ideas.
- 2026-11-24: Player button redesigned: own SVG subtitle icon (22x18 glyph like CC) + target-language badge (grey off, red on). User confirmed look.
- 2026-11-24: M4 checked in Chrome: TED en->ru with Auto; Russian video with en auto-dub -> "already in Russian"; German video via SPA -> asks for click, click downloads de->ru model, subtitles translate.
- 2026-11-24: M4 code: `utils/language.ts` detectSpokenLanguage, From=Auto default, translator per pair, "already in X" note. 28 unit tests.
- 2026-11-24: M3 checked in Chrome: "No English subtitles. This video has: Russian." shown and hidden after 8 s, button stays on; `en-US` ASR-only video translates.
- 2026-11-24: M3 code: clear error texts (lists available caption languages), 10 s caption timeout, warning after 3 failed translations, same-language check. 21 unit tests.
- 2026-11-24: M2 checked in Chrome: cache hit shows translation in 1 frame (uncached 150-1650 ms); popup checked by user (font, mode, language switch).
- 2026-11-24: M2 code: popup (languages, display, font size) in `sync:settings`, LRU per-video cache (50 videos) in storage.local. 17 unit tests.
- 2026-11-24: M1 checked in Chrome: dual lines synced, native CC hidden, seek, SPA switch to another video, toggle off.
- 2026-11-24: M1 MVP code: captions parse/merge, TranslationQueue, Chrome translator, overlay, player button, SPA restart. 10 unit tests.
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
- Spoken language = original (non-`isAutoDubbed`) audio track from `streamingData.adaptiveFormats[].audioTrack`, else single non-dub ASR track. Not `player.getAudioTrack()`: minified field names. ASR alone is unreliable (dub ASR tracks, wrong guesses like `uk` for Russian audio).
- "Already in target language" is checked even with a fixed From: translating YouTube's machine English back to the spoken language is useless.
- MVP covers `youtube.com/watch` only: Shorts/live handle captions differently. M5 adds Shorts.
- Shorts (spike 2026-11-25): player is `#shorts-player` (getPlayerResponse + captionTracks work); a hidden 0x0 `#movie_player` is also on the page, so never pick the player by `#movie_player` alone. Swipe fires `yt-navigate-start/finish`; the same `<video>` element is reused. CC button lives in `ytd-shorts-player-controls #right-controls` (`#closed-captioning-button-container`), outside the player element.
- Shorts captions: direct `baseUrl&fmt=json3` returns 200 with an empty body (also with `&c=WEB`); the player's own XHR has `pot` and works. `player.setOption('captions','track',{languageCode})` makes the player send it, so the intercept fallback can be triggered on demand. Same video on `/watch`: direct fetch still works.
- Embeds dropped (spike 2026-11-25): YouTube's default embed `allow` list has no `translator`; inside such iframes the content script gets `availability() = 'unavailable'` and `create()` throws NotAllowedError (Permissions-Policy). Works only with `allow="translator"`. Embed player has no player response until play; after play `loadeddata` + getPlayerResponse give tracks.

## Open questions / blockers
- Direct caption fetch tested only on a logged-in Premium account; may need `pot` when logged out. Fallback (XHR intercept) is ready.
- Not seen in a real browser: 'timeout', 'fetch-failed', 'translation keeps failing', API missing (all code paths, unit-tested texts only). New download text "(one time only)" not re-seen; download progress itself was seen by user in M2.
- ASR json3 tracks are word-level segments with `"\n"` events: need grouping into readable lines.
