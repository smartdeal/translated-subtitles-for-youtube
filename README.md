# Translated Subtitles for YouTube

Chrome extension that shows YouTube subtitles translated into your language, under or instead of the original line. Translation runs on your device with Chrome's built-in Translator API: no account, no API key, no servers.

Not affiliated with or endorsed by YouTube or Google.

## Features
- Works on `youtube.com/watch` and Shorts.
- Uses the video's own subtitles, including auto-generated ones.
- Source language: auto (the video's spoken language) or fixed. Videos already in your language are skipped.
- Display: original + translation, or translation only; adjustable font size.
- Translates ahead of playback and caches per video, so seeking and rewatching are instant.

## Requirements
- Desktop Chrome 138 or newer. The Translator API is not available on mobile.
- The first use of a language pair downloads a translation model (one time, needs a click on the player button).

## Use
1. Open a YouTube video with subtitles.
2. Click the subtitle button with the language badge in the player bar.
3. Change languages and display in the toolbar popup.

## Development
```
npm install
npm run dev        # Chrome with hot reload
npm test           # Vitest
npm run typecheck
npm run build      # load .output/chrome-mv3 unpacked
npm run zip        # store package in .output/
```

## Privacy
See [PRIVACY.md](PRIVACY.md).
