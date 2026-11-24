// User settings (chrome.storage.sync) with validation of stored values.
import { storage } from 'wxt/utils/storage';

export type DisplayMode = 'dual' | 'translation';

export const AUTO = 'auto';

export interface Settings {
  /** A language code, or AUTO for the video's spoken language. */
  sourceLanguage: string;
  targetLanguage: string;
  display: DisplayMode;
  fontScale: number; // 1 = default size
}

/** Languages offered in the popup (BCP 47). The Translator API decides what really works. */
export const LANGUAGES = [
  'ar', 'bg', 'cs', 'da', 'de', 'el', 'en', 'es', 'fi', 'fr', 'he', 'hi', 'hr', 'hu', 'id', 'it',
  'ja', 'ko', 'lt', 'nl', 'no', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'ta', 'te', 'th', 'tr',
  'uk', 'vi', 'zh', 'zh-Hant',
] as const;

/** Browser UI language -> closest entry of LANGUAGES, else 'en'. */
export function defaultTargetLanguage(uiLanguage: string): string {
  const [base = '', region = ''] = uiLanguage.split('-');
  if (base === 'zh') return ['TW', 'HK', 'MO', 'Hant'].includes(region) ? 'zh-Hant' : 'zh';
  if (base === 'nb' || base === 'nn') return 'no';
  return (LANGUAGES as readonly string[]).includes(base) ? base : 'en';
}

export const DEFAULT_SETTINGS: Settings = {
  sourceLanguage: AUTO,
  targetLanguage: defaultTargetLanguage(typeof navigator === 'undefined' ? '' : navigator.language),
  display: 'dual',
  fontScale: 1,
};

export const FONT_SCALE_MIN = 0.6;
export const FONT_SCALE_MAX = 2;

const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/** Merge a stored value over the defaults, dropping anything invalid. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Settings, unknown>>;
  const lang = (v: unknown, d: string) => (typeof v === 'string' && LANG_RE.test(v) ? v : d);
  const scale = typeof r.fontScale === 'number' && Number.isFinite(r.fontScale) ? r.fontScale : DEFAULT_SETTINGS.fontScale;
  return {
    sourceLanguage: r.sourceLanguage === AUTO ? AUTO : lang(r.sourceLanguage, DEFAULT_SETTINGS.sourceLanguage),
    targetLanguage: lang(r.targetLanguage, DEFAULT_SETTINGS.targetLanguage),
    display: r.display === 'translation' ? 'translation' : 'dual',
    fontScale: Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, scale)),
  };
}

const item = storage.defineItem<unknown>('sync:settings', { fallback: DEFAULT_SETTINGS });

export async function loadSettings(): Promise<Settings> {
  return sanitizeSettings(await item.getValue());
}

export async function saveSettings(s: Settings): Promise<void> {
  await item.setValue(sanitizeSettings(s));
}

export function watchSettings(cb: (s: Settings) => void): () => void {
  return item.watch((v) => cb(sanitizeSettings(v)));
}
