import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, FONT_SCALE_MAX, sanitizeSettings } from '../utils/settings';

describe('sanitizeSettings', () => {
  it('returns defaults for missing or broken values', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('x')).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ targetLanguage: '<img>', display: 'big', fontScale: NaN })).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and clamps the font scale', () => {
    expect(sanitizeSettings({ sourceLanguage: 'de', targetLanguage: 'zh-Hant', display: 'translation', fontScale: 9 })).toEqual({
      sourceLanguage: 'de',
      targetLanguage: 'zh-Hant',
      display: 'translation',
      fontScale: FONT_SCALE_MAX,
    });
  });
});
