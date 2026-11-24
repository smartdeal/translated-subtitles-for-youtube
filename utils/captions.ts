// Parse YouTube json3 caption tracks into cues.

export interface Cue {
  start: number; // ms
  end: number; // ms
  text: string;
}

interface Json3Seg {
  utf8?: string;
}
interface Json3Event {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: Json3Seg[];
}
export interface Json3 {
  events?: Json3Event[];
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/** One cue per event that has visible text. Ends are clamped so cues never overlap. */
export function parseJson3(json: Json3): Cue[] {
  const cues: Cue[] = [];
  for (const e of json.events ?? []) {
    if (!e.segs || e.tStartMs == null) continue;
    const text = clean(e.segs.map((s) => s.utf8 ?? '').join(''));
    if (!text) continue;
    cues.push({ start: e.tStartMs, end: e.tStartMs + (e.dDurationMs ?? 0), text });
  }
  cues.sort((a, b) => a.start - b.start);
  for (let i = 0; i < cues.length - 1; i++) {
    const cur = cues[i]!;
    const next = cues[i + 1]!;
    if (cur.end > next.start) cur.end = next.start;
  }
  return cues;
}

export interface MergeOptions {
  maxChars: number; // stop a line before it grows past this
  maxGapMs: number; // a longer pause starts a new line
}

const SENTENCE_END = /[.!?…]["')\]]?$/;

/**
 * Auto-generated (ASR) tracks come as short fragments of a few words.
 * Join neighbours into readable lines: split on sentence ends, long pauses,
 * or length. Better lines also give the translator more context.
 */
export function mergeFragments(cues: Cue[], opts: MergeOptions = { maxChars: 80, maxGapMs: 1200 }): Cue[] {
  const out: Cue[] = [];
  let cur: Cue | null = null;
  for (const c of cues) {
    if (
      cur &&
      c.start - cur.end <= opts.maxGapMs &&
      cur.text.length + 1 + c.text.length <= opts.maxChars &&
      !SENTENCE_END.test(cur.text)
    ) {
      cur.text += ' ' + c.text;
      cur.end = Math.max(cur.end, c.end);
    } else {
      if (cur) out.push(cur);
      cur = { ...c };
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Index of the cue shown at time `t` (ms), or -1. Cues must be sorted and non-overlapping. */
export function findCueIndex(cues: Cue[], t: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = cues[mid]!;
    if (t < c.start) hi = mid - 1;
    else if (t >= c.end) lo = mid + 1;
    else return mid;
  }
  return -1;
}

/** Index of the first cue that ends after `t`: where translation should start. */
export function firstCueFrom(cues: Cue[], t: number): number {
  let lo = 0;
  let hi = cues.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid]!.end <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
