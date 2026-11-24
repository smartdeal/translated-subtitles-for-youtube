import { describe, expect, it } from 'vitest';
import type { Cue } from '../utils/captions';
import { TranslationQueue } from '../utils/translation-queue';
import type { TextTranslator } from '../utils/translator';

const cues: Cue[] = Array.from({ length: 6 }, (_, i) => ({ start: i * 1000, end: (i + 1) * 1000, text: `t${i}` }));

function fakeTranslator(order: string[], failOn?: string): TextTranslator {
  return {
    async translate(text) {
      order.push(text);
      await Promise.resolve();
      if (text === failOn) throw new Error('boom');
      return text.toUpperCase();
    },
    destroy() {},
  };
}

async function settle(q: TranslationQueue): Promise<void> {
  for (let i = 0; i < 100 && !q.done; i++) await new Promise((r) => setTimeout(r, 0));
}

describe('TranslationQueue', () => {
  it('starts from the playback position, then wraps to earlier cues', async () => {
    const order: string[] = [];
    const q = new TranslationQueue(cues, fakeTranslator(order));
    q.seek(3500);
    await settle(q);
    expect(order).toEqual(['t3', 't4', 't5', 't0', 't1', 't2']);
    expect(q.translations).toEqual(['T0', 'T1', 'T2', 'T3', 'T4', 'T5']);
  });

  it('jumps to the new position on seek and does not redo finished cues', async () => {
    const order: string[] = [];
    const q = new TranslationQueue(cues, fakeTranslator(order), (i) => {
      if (i === 0) q.seek(4000);
    });
    q.seek(0);
    await settle(q);
    expect(order).toEqual(['t0', 't4', 't5', 't1', 't2', 't3']);
  });

  it('marks a failed cue as empty, reports it, and continues', async () => {
    const errors: number[] = [];
    const q = new TranslationQueue(cues, fakeTranslator([], 't1'), undefined, (i) => errors.push(i));
    q.seek(0);
    await settle(q);
    expect(errors).toEqual([1]);
    expect(q.translations[1]).toBe('');
    expect(q.translations[2]).toBe('T2');
  });

  it('stops translating after stop()', async () => {
    const order: string[] = [];
    const q = new TranslationQueue(cues, fakeTranslator(order), (i) => {
      if (i === 1) q.stop();
    });
    q.seek(0);
    await settle(q);
    expect(order).toEqual(['t0', 't1']);
  });
});

describe('TranslationQueue cache', () => {
  it('skips cues known from cache and exports finished translations', async () => {
    const order: string[] = [];
    const q = new TranslationQueue(cues, fakeTranslator(order, 't5'), undefined, undefined, { t1: 'cached1', t2: 'cached2' });
    q.seek(0);
    await settle(q);
    expect(order).toEqual(['t0', 't3', 't4', 't5']);
    expect(q.translations[1]).toBe('cached1');
    expect(q.toMap()).toEqual({ t0: 'T0', t1: 'cached1', t2: 'cached2', t3: 'T3', t4: 'T4' });
  });

  it('ignores inherited object keys in the cache map', () => {
    const q = new TranslationQueue([{ start: 0, end: 1, text: 'constructor' }], fakeTranslator([]));
    expect(q.translations[0]).toBeUndefined();
  });
});
