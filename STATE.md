# Project state

Last updated: 2026-11-25

## Status
M0-M5 done and merged into `master`. M6 (Web Store release) in progress on `feat/m6-web-store`.

## Current focus
M6: prepare and submit the Web Store release.

## Next steps
- M6: merge, push public repo `smartdeal/translated-subtitles-for-youtube`, enable Pages, check privacy URL; then upload by user.

## Recent changes
<!-- newest first, keep ~10 -->
- 2026-11-25: 1.0.0 build checked in Chrome: TED /watch en->ru dual lines, Short en->ru with button in Shorts controls. Store screenshots `docs/store/screenshot-1.png` (watch, theater) and `-2.png` (Short), 1280x800, masthead hidden. Default-language change not seen in a fresh profile (unit tests only).
- 2026-11-25: M6 prep: manifest name/description/`minimum_chrome_version` 138, version 1.0.0, icons (`docs/store/src/*.svg` -> `public/icon/`, rendered with `rsvg-convert`), README, PRIVACY, store kit `docs/store/listing.md`, promo tile. Default target language = browser UI language (`defaultTargetLanguage`), 61 tests. Zip: `.output/translation-plugin-1.0.0-chrome.zip`, 10 files, 24 kB. Not yet checked in Chrome.
- 2026-11-25: M5 done. Live streams: `chooseTrack(..., isLive)` -> 'live' -> "Live streams are not supported yet." 51 unit tests. Final check on the real build: CNN live -> live text; TED /watch translates, overlay centered, 80% width; SPA to Shorts with button on: no-subtitles x2, en->ru in 2.8 s, "already in Russian", silent Short shows nothing until speech at 29 s (correct); one button, stays on through swipes, native CC hidden.
- 2026-11-25: Shorts overlay: `bottom:22%` (title panel covers ~87-97% in narrow layout), smaller font limits, native CC hidden on any `.tp-active` player. Fixed centering: `left:50%`+`translateX(-50%)` capped the box at half the player width and wrapped short lines; now `left:0;right:0;margin:auto`. Checked in Chrome with the rules injected live (wide + 700 px window); real build not yet reloaded.
- 2026-11-25: Fix: a video with no caption tracks (and unknown language) said "Could not tell which language"; now "This video has no subtitles." Track choice moved to `chooseTrack` in `utils/caption-fetch.ts`. 48 unit tests. Checked in Chrome on a Short without captions; built `pointer-events:auto` CSS confirmed (click does not pause).
- 2026-11-25: Shorts button: one button moved to the CC button of the current page (`BUTTON_ANCHOR_SELECTOR` in `utils/page.ts`), `tp-shorts` style (48 px round). Shorts controls have `pointer-events:none`: button needs `pointer-events:auto` or clicks hit the video. Checked in Chrome: looks like the native controls; click translates without pausing; swipe -> button re-inserted, stays on, session restarts.
- 2026-11-25: Shorts captions: `utils/caption-fetch.ts` loadTrackJson (direct fetch -> intercepted copy -> ask player via setOption, wait <=5 s, restore user's CC track). Isolated caption timeout 10 -> 15 s. 43 unit tests. Checked in Chrome: /watch still direct fetch only; English Short en->ru in 3.4 s via player XHR with `pot`, CC back off; Russian Short with en dub -> "already in Russian".
- 2026-11-25: `utils/page.ts` (watch/shorts, 11-char video id, player selectors; MAIN world picks the player by video id). 35 unit tests. Checked in Chrome: TED en->ru on /watch; SPA to a Short with button on -> overlay on `#shorts-player`, expected fetch-failed text.
- 2026-11-25: M5 spike done in Chrome (Shorts + embeds); embeds dropped from M5 (user pick), see Decisions.
- 2026-11-25: M5 planned: Shorts + embeds (user pick). Live streams stay in Ideas.
- 2026-11-24: Player button redesigned: own SVG subtitle icon (22x18 glyph like CC) + target-language badge (grey off, red on). User confirmed look.
- 2026-11-24: M4 checked in Chrome: TED en->ru with Auto; Russian video with en auto-dub -> "already in Russian"; German video via SPA -> asks for click, click downloads de->ru model, subtitles translate.

## Decisions
<!-- decision: reason -->
- Store: name "Translated Subtitles for YouTube" ("YouTube" only as "for YouTube" per brand rules), Unlisted first, English listing, privacy policy on GitHub Pages.
- Chrome built-in Translator API first: free, private, no key; engine behind an interface for DeepL/LLM later.
- WXT + TypeScript: MV3 and hot reload out of the box; easy Web Store release later.
- Translate ahead from playback position + cache per video in `chrome.storage.local`: API is sequential; seek/rewatch stay instant.
- TypeScript 5.9 (not 7.x): WXT peer range is >=5.4; TS 7 native compiler untested with WXT tooling.
- Translator runs in the isolated content script: works there; first `create()` needs the click gesture (model download ~8.5 s once), later calls need none. ~40 ms per line sequential, ~13 s for a 315-line talk.
- Caption source: MAIN-world script reads `captionTracks` from `getPlayerResponse()` of the player holding the requested video (`utils/page.ts`) and fetches `baseUrl&fmt=json3`; fallback: intercept player's own `/api/timedtext` XHR; if none yet (Shorts), turn the track on with `setOption('captions','track',...)`, take the copy, restore the user's CC track (`utils/caption-fetch.ts`). Pass cues to isolated world via `window.postMessage`.
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
