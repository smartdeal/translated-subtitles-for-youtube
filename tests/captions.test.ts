import { describe, expect, it } from 'vitest';
import { findCueIndex, firstCueFrom, mergeFragments, parseJson3, type Cue } from '../utils/captions';

describe('parseJson3', () => {
  it('builds cues from events with text, skipping empty and newline-only ones', () => {
    const cues = parseJson3({
      events: [
        { tStartMs: 0, dDurationMs: 100000 }, // window event, no segs
        { tStartMs: 1000, dDurationMs: 2000, segs: [{ utf8: 'so ' }, { utf8: 'in' }] },
        { tStartMs: 1500, dDurationMs: 300, segs: [{ utf8: '\n' }] },
        { tStartMs: 2500, dDurationMs: 1000, segs: [{ utf8: ' college,\n I was ' }] },
      ],
    });
    expect(cues).toEqual([
      { start: 1000, end: 2500, text: 'so in' }, // end clamped to next start
      { start: 2500, end: 3500, text: 'college, I was' },
    ]);
  });

  it('handles a missing events array', () => {
    expect(parseJson3({})).toEqual([]);
  });
});

describe('mergeFragments', () => {
  const c = (start: number, end: number, text: string): Cue => ({ start, end, text });

  it('joins close fragments and splits on sentence end', () => {
    const out = mergeFragments([c(0, 500, 'so in'), c(500, 1000, 'college.'), c(1000, 1500, 'I was')]);
    expect(out).toEqual([c(0, 1000, 'so in college.'), c(1000, 1500, 'I was')]);
  });

  it('splits on a long pause and on max length', () => {
    const out = mergeFragments([c(0, 500, 'aaaa'), c(3000, 3500, 'bbbb'), c(3500, 4000, 'cccc')], {
      maxChars: 8,
      maxGapMs: 1000,
    });
    expect(out.map((x) => x.text)).toEqual(['aaaa', 'bbbb', 'cccc']);
  });
});

describe('cue lookup', () => {
  const cues: Cue[] = [
    { start: 1000, end: 2000, text: 'a' },
    { start: 2000, end: 3000, text: 'b' },
    { start: 5000, end: 6000, text: 'c' },
  ];

  it('findCueIndex returns the active cue or -1 in gaps', () => {
    expect(findCueIndex(cues, 999)).toBe(-1);
    expect(findCueIndex(cues, 1000)).toBe(0);
    expect(findCueIndex(cues, 2000)).toBe(1);
    expect(findCueIndex(cues, 4000)).toBe(-1);
    expect(findCueIndex(cues, 5999)).toBe(2);
    expect(findCueIndex(cues, 6000)).toBe(-1);
    expect(findCueIndex([], 0)).toBe(-1);
  });

  it('firstCueFrom returns the first cue not yet finished', () => {
    expect(firstCueFrom(cues, 0)).toBe(0);
    expect(firstCueFrom(cues, 2500)).toBe(1);
    expect(firstCueFrom(cues, 4000)).toBe(2);
    expect(firstCueFrom(cues, 7000)).toBe(3);
  });
});
