// User-facing status and error texts (kept pure for tests).
import type { CaptionsErrorReason } from './messages';

export function languageName(code: string, uiLang = 'en'): string {
  try {
    return new Intl.DisplayNames([uiLang, 'en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

const MAX_LISTED = 5;

export function captionsErrorText(
  reason: CaptionsErrorReason,
  sourceLanguage: string,
  available: string[] = [],
  uiLang = 'en',
): string {
  switch (reason) {
    case 'no-track': {
      const src = languageName(sourceLanguage, uiLang);
      if (!available.length) return 'This video has no subtitles.';
      const names = available.slice(0, MAX_LISTED).map((c) => languageName(c, uiLang));
      const more = available.length > MAX_LISTED ? `, +${available.length - MAX_LISTED} more` : '';
      return `No ${src} subtitles. This video has: ${names.join(', ')}${more}. Change "From" in the extension popup.`;
    }
    case 'no-player':
      return 'Player not ready. Turn the button off and on again.';
    case 'fetch-failed':
      return 'Could not load subtitles. Turn on CC once, then try again.';
    case 'timeout':
      return 'Subtitles did not load in time. Reload the page and try again.';
  }
}

export const TRANSLATION_FAILING = 'Translation keeps failing. Turn the button off and on again.';

export function downloadText(fraction: number): string {
  const pct = Math.max(0, Math.min(100, Math.round(fraction * 100)));
  return `Downloading translation model… ${pct}% (one time only)`;
}
