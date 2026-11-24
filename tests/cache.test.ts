import { describe, expect, it } from 'vitest';
import { cacheKey, TranslationCache, type KeyValueStore } from '../utils/cache';

function memoryStore(): KeyValueStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: async <T>(k: string) => (data.has(k) ? (structuredClone(data.get(k)) as T) : null),
    set: async (k, v) => void data.set(k, structuredClone(v)),
    remove: async (ks) => ks.forEach((k) => data.delete(k)),
  };
}

describe('TranslationCache', () => {
  it('round-trips a map and returns {} for a miss or bad data', async () => {
    const store = memoryStore();
    const cache = new TranslationCache(store);
    const k = cacheKey('vid1', 'en', 'ru');
    expect(await cache.load(k)).toEqual({});
    await cache.save(k, { hello: 'привет' });
    expect(await cache.load(k)).toEqual({ hello: 'привет' });
    store.data.set(k, 'garbage');
    expect(await cache.load(k)).toEqual({});
  });

  it('evicts the least recently used videos', async () => {
    const store = memoryStore();
    let t = 0;
    const cache = new TranslationCache(store, 2, () => ++t);
    const [a, b, c] = ['a', 'b', 'c'].map((v) => cacheKey(v, 'en', 'ru')) as [string, string, string];
    await cache.save(a, { x: '1' });
    await cache.save(b, { x: '2' });
    await cache.load(a); // a is now newer than b
    await cache.save(c, { x: '3' });
    expect(store.data.has(a)).toBe(true);
    expect(store.data.has(b)).toBe(false);
    expect(store.data.has(c)).toBe(true);
  });

  it('keys depend on video and language pair', () => {
    expect(cacheKey('v', 'en', 'ru')).not.toBe(cacheKey('v', 'en', 'uk'));
  });
});
