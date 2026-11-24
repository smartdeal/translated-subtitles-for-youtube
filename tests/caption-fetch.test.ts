import { describe, expect, it, vi } from 'vitest';
import { chooseTrack, loadTrackJson, type CaptionPlayer } from '../utils/caption-fetch';
import type { Json3 } from '../utils/captions';

const JSON3: Json3 = { events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: 'hi' }] }] };
const TRACK = { languageCode: 'ru', kind: 'asr' };

function fakePlayer(current: unknown = {}) {
  const calls: unknown[] = [];
  let state = current;
  const player: CaptionPlayer = {
    loadModule: vi.fn(),
    getOption: vi.fn(() => state),
    setOption: vi.fn((_m: string, _k: string, v: unknown) => {
      state = v;
      calls.push(v);
    }),
  };
  return { player, calls };
}

const fast = { timeoutMs: 200, pollMs: 5 };

describe('loadTrackJson', () => {
  it('uses the direct fetch when it returns events, without touching the player', async () => {
    const { player } = fakePlayer();
    const json = await loadTrackJson({
      ...fast,
      player,
      track: TRACK,
      fetchDirect: async () => JSON.stringify(JSON3),
      intercepted: () => undefined,
    });
    expect(json).toEqual(JSON3);
    expect(player.setOption).not.toHaveBeenCalled();
  });

  it('uses an already intercepted copy before asking the player', async () => {
    const { player } = fakePlayer();
    const json = await loadTrackJson({ ...fast, player, track: TRACK, fetchDirect: async () => '', intercepted: () => JSON3 });
    expect(json).toBe(JSON3);
    expect(player.setOption).not.toHaveBeenCalled();
  });

  it('empty direct body (Shorts): turns the track on, takes the intercepted copy, turns CC off again', async () => {
    const { player, calls } = fakePlayer({});
    let got: Json3 | undefined;
    const p = loadTrackJson({ ...fast, player, track: TRACK, fetchDirect: async () => '', intercepted: () => got });
    setTimeout(() => (got = JSON3), 20); // the player's own request lands later
    expect(await p).toBe(JSON3);
    expect(player.loadModule).toHaveBeenCalledWith('captions');
    expect(calls).toEqual([{ languageCode: 'ru', kind: 'asr' }, {}]);
  });

  it('gives up after the timeout and still turns CC off', async () => {
    const { player, calls } = fakePlayer({});
    const json = await loadTrackJson({ ...fast, player, track: TRACK, fetchDirect: async () => '', intercepted: () => undefined });
    expect(json).toBeUndefined();
    expect(calls).toEqual([{ languageCode: 'ru', kind: 'asr' }, {}]);
  });

  it('restores the track the user had on', async () => {
    const userTrack = { languageCode: 'en', kind: 'asr' };
    const { player, calls } = fakePlayer(userTrack);
    let got: Json3 | undefined;
    setTimeout(() => (got = JSON3), 10);
    await loadTrackJson({ ...fast, player, track: TRACK, fetchDirect: async () => '', intercepted: () => got });
    expect(calls).toEqual([{ languageCode: 'ru', kind: 'asr' }, userTrack]);
  });

  it('a manual track is requested without kind', async () => {
    const { player, calls } = fakePlayer();
    await loadTrackJson({ ...fast, player, track: { languageCode: 'en' }, fetchDirect: async () => '', intercepted: () => undefined });
    expect(calls[0]).toEqual({ languageCode: 'en' });
  });

  it('falls back when the direct fetch throws or is not json3', async () => {
    for (const fetchDirect of [async () => Promise.reject(new Error('net')), async () => '<xml/>', async () => '{}']) {
      const json = await loadTrackJson({ ...fast, player: fakePlayer().player, track: TRACK, fetchDirect, intercepted: () => JSON3 });
      expect(json).toBe(JSON3);
    }
  });

  it('without a player API it returns undefined instead of throwing', async () => {
    const json = await loadTrackJson({ ...fast, player: {}, track: TRACK, fetchDirect: async () => '', intercepted: () => undefined });
    expect(json).toBeUndefined();
  });
});

describe('chooseTrack', () => {
  const t = (languageCode: string, kind?: string) => ({ languageCode, kind });

  it('a video without any caption track is "no-track", not "unknown-language"', () => {
    // Real case: a Short with no captions and no audio-track info.
    expect(chooseTrack([], 'auto', undefined)).toEqual({ error: 'no-track', available: [] });
    expect(chooseTrack([], 'en', undefined)).toEqual({ error: 'no-track', available: [] });
  });

  it('unknown spoken language with tracks present is "unknown-language"', () => {
    expect(chooseTrack([t('en', 'asr'), t('de')], 'auto', undefined)).toEqual({
      error: 'unknown-language',
      available: ['en', 'de'],
    });
  });

  it('prefers a manual track over ASR and normalizes the language', () => {
    const manual = t('en-GB');
    expect(chooseTrack([t('en-US', 'asr'), manual], 'auto', 'en')).toEqual({ track: manual, lang: 'en' });
    expect(chooseTrack([t('en-US', 'asr')], 'en-US', undefined)).toEqual({ track: t('en-US', 'asr'), lang: 'en' });
  });

  it('lists available languages when the wanted one is missing', () => {
    expect(chooseTrack([t('ru', 'asr'), t('ru')], 'en', 'ru')).toEqual({ error: 'no-track', available: ['ru'] });
  });
});
