// Per-video translation cache in chrome.storage.local.
// Entry = map from original line to translation, so it survives small
// changes in how lines are split. Keeps the most recent MAX_VIDEOS videos.

export interface KeyValueStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

export type TranslationMap = Record<string, string>;

const INDEX_KEY = 'tp-cache-index';
const PREFIX = 'tp-cache:';
export const MAX_VIDEOS = 50;

interface IndexEntry {
  key: string;
  usedAt: number;
}

export function cacheKey(videoId: string, from: string, to: string): string {
  return `${PREFIX}${videoId}:${from}:${to}`;
}

export class TranslationCache {
  constructor(
    private readonly store: KeyValueStore,
    private readonly maxVideos = MAX_VIDEOS,
    private readonly now: () => number = Date.now,
  ) {}

  async load(key: string): Promise<TranslationMap> {
    const map = await this.store.get<TranslationMap>(key);
    if (!map || typeof map !== 'object') return {};
    await this.touch(key);
    return map;
  }

  async save(key: string, map: TranslationMap): Promise<void> {
    await this.store.set(key, map);
    await this.touch(key);
  }

  private async touch(key: string): Promise<void> {
    const raw = await this.store.get<IndexEntry[]>(INDEX_KEY);
    const index = (Array.isArray(raw) ? raw : []).filter((e) => e.key !== key);
    index.push({ key, usedAt: this.now() });
    index.sort((a, b) => b.usedAt - a.usedAt);
    const evicted = index.splice(this.maxVideos);
    await this.store.set(INDEX_KEY, index);
    if (evicted.length) await this.store.remove(evicted.map((e) => e.key));
  }
}
