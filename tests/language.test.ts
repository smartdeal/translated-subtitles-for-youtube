import { describe, expect, it } from 'vitest';
import { detectSpokenLanguage, normalizeLang, sameLanguage } from '../utils/language';

const audio = (...tracks: { id: string; def?: boolean; dub?: boolean }[]) => ({
  adaptiveFormats: tracks.map((t) => ({ audioTrack: { id: t.id, audioIsDefault: t.def, isAutoDubbed: t.dub } })),
});
const captions = (...tracks: [string, string?][]) => ({
  playerCaptionsTracklistRenderer: { captionTracks: tracks.map(([languageCode, kind]) => ({ languageCode, kind })) },
});

describe('normalizeLang', () => {
  it('drops regions, maps old Hebrew code, keeps Chinese script', () => {
    expect(normalizeLang('en-US')).toBe('en');
    expect(normalizeLang('iw')).toBe('he');
    expect(normalizeLang('zh-TW')).toBe('zh-Hant');
    expect(normalizeLang('zh-CN')).toBe('zh');
  });

  it('sameLanguage compares base languages', () => {
    expect(sameLanguage('ru', 'ru-RU')).toBe(true);
    expect(sameLanguage('en', 'ru')).toBe(false);
  });
});

describe('detectSpokenLanguage', () => {
  it('uses the original (not auto-dubbed) audio track', () => {
    // Real case: Russian video with an English auto-dub and ASR tracks for both.
    expect(
      detectSpokenLanguage({
        streamingData: audio({ id: 'en-US.10', dub: true }, { id: 'ru.4', def: true }),
        captions: captions(['en-US', 'asr'], ['ru', 'asr']),
      }),
    ).toBe('ru');
  });

  it('trusts audio over a wrong ASR guess', () => {
    // Real case: ASR said "uk", audio says Russian original.
    expect(
      detectSpokenLanguage({
        streamingData: audio({ id: 'en-US.10', dub: true }, { id: 'ru.4', def: true }),
        captions: captions(['en'], ['en', 'asr'], ['uk', 'asr']),
      }),
    ).toBe('ru');
  });

  it('falls back to a single ASR track when there is no audio info', () => {
    expect(detectSpokenLanguage({ captions: captions(['de'], ['en', 'asr'], ['fr']) })).toBe('en');
  });

  it('ignores ASR tracks that belong to a dub', () => {
    expect(
      detectSpokenLanguage({
        streamingData: audio({ id: 'en-US.10', dub: true }, { id: 'und.4' }),
        captions: captions(['en', 'asr'], ['pl', 'asr']),
      }),
    ).toBe('pl');
  });

  it('returns undefined when unsure', () => {
    expect(detectSpokenLanguage({})).toBeUndefined();
    expect(detectSpokenLanguage({ captions: captions(['en', 'asr'], ['de', 'asr']) })).toBeUndefined();
  });
});
