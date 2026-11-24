# Chrome Web Store kit

Copy these into the developer dashboard. Visibility: **Unlisted**. Language: English.

## Store listing

**Name** (from manifest): Translated Subtitles for YouTube

**Summary** (from manifest, 121/132 chars):
Shows YouTube subtitles translated into your language, side by side with the original. On-device translation, no account.

**Category**: Tools (alternative: Education)

**Description**:
```
Watch YouTube videos in any language with subtitles translated into yours.

The extension takes the video's own subtitles (including auto-generated ones) and shows the translation right in the player: under the original line, or on its own.

FEATURES
- One click: a subtitle button with your language badge in the player bar.
- Works on regular videos and Shorts.
- Auto-detects the video's spoken language; skips videos already in your language.
- Original + translation, or translation only. Adjustable font size.
- Translates ahead of playback and caches each video, so seeking and rewatching are instant.

PRIVATE BY DESIGN
Translation runs on your device with Chrome's built-in Translator API. No account, no API key, no servers, no tracking. Subtitle text never goes to the developer or to any third-party service.

REQUIREMENTS
- Desktop Chrome 138 or newer.
- The first time you use a language pair, Chrome downloads a translation model once.
- The video must have subtitles (manual or auto-generated). Live streams are not supported yet.

Not affiliated with or endorsed by YouTube or Google.
```

**Graphics** (in `docs/store/`):
- Store icon: `public/icon/128.png`
- Screenshots 1280x800: `screenshot-*.png` (1 to 5)
- Small promo tile 440x280: `promo-small.png`

**Homepage URL**: https://github.com/smartdeal/translated-subtitles-for-youtube
**Support URL**: https://github.com/smartdeal/translated-subtitles-for-youtube/issues

## Privacy practices tab

**Single purpose**:
```
Show translated subtitles for the YouTube video the user is watching.
```

**Permission justifications**:
- `storage`:
  ```
  Saves the user's settings (languages, display mode, font size) and a per-video cache of translated subtitle lines so rewatching does not translate again. Nothing leaves the device except Chrome Sync of settings, if the user has it on.
  ```
- Host permission `*://www.youtube.com/*` (content scripts):
  ```
  Needed to read the subtitle track of the video on the page, add the translate button to the YouTube player, and draw the translated subtitles over the video. The extension runs on no other site.
  ```

**Remote code**: No, I am not using remote code. (All JS is in the package; no eval, no external scripts.)

**Data usage**: the User Data FAQ (https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) requires disclosure even when data is handled only on the device, and lists "website content" as user data. Tick:
- **Website content**: subtitle text of the video on the page (read, translated on device, cached).
- **Web history**: the cache is keyed by video id, so it is a local record of videos the user translated. Ticking it is the safe side; under-disclosure is a rejection reason, over-disclosure is not.

Leave all other types unticked (no personal info, auth, location, communications, user activity tracking, financial, health).

Certify all three statements (no sale, no unrelated use, no creditworthiness use).

**Privacy policy URL**: https://smartdeal.github.io/translated-subtitles-for-youtube/PRIVACY.html

## Distribution
- Visibility: Unlisted.
- Regions: all.

## Before each upload
1. Bump `version` in `package.json` (the store rejects a repeated version).
2. `npm test && npm run typecheck && npm run zip`.
3. Upload `.output/translation-plugin-<version>-chrome.zip`.
