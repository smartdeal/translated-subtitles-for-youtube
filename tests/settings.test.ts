import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, FONT_SCALE_MAX, defaultTargetLanguage, sanitizeSettings } from '../utils/settings';

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

describe('defaultTargetLanguage', () => {
  it.each([
    ['ru', 'ru'],
    ['de-DE', 'de'],
    ['en-US', 'en'],
    ['zh-CN', 'zh'],
    ['zh-TW', 'zh-Hant'],
    ['zh-HK', 'zh-Hant'],
    ['nb', 'no'],
    ['pt-BR', 'pt'],
    ['xx', 'en'],
    ['', 'en'],
  ])('%s -> %s', (ui, expected) => {
    expect(defaultTargetLanguage(ui)).toBe(expected);
  });
});
