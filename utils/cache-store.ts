// chrome.storage.local adapter for TranslationCache (kept apart so tests need no browser).
import { storage } from 'wxt/utils/storage';
import type { KeyValueStore } from './cache';

export const localStore: KeyValueStore = {
  get: <T>(key: string) => storage.getItem<T>(`local:${key}`),
  set: (key, value) => storage.setItem(`local:${key}`, value),
  remove: (keys) => storage.removeItems(keys.map((k) => `local:${k}` as const)),
};
