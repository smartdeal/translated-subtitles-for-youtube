// Translates cues one at a time (the Chrome API is sequential anyway),
// always starting from the playback position. On seek it restarts from
// the new position; cues already translated are kept.
import { firstCueFrom, type Cue } from './captions';
import type { TextTranslator } from './translator';

export class TranslationQueue {
  readonly translations: (string | undefined)[];
  private cursor = 0;
  private running = false;
  private stopped = false;
  private abort = new AbortController();

  constructor(
    private readonly cues: Cue[],
    private readonly translator: TextTranslator,
    private readonly onTranslated: (index: number) => void = () => {},
    private readonly onError: (index: number, err: unknown) => void = () => {},
    known: Record<string, string> = {},
  ) {
    // Prefill from cache; Object.hasOwn avoids keys like "constructor".
    this.translations = cues.map((c) => (Object.hasOwn(known, c.text) ? known[c.text] : undefined));
  }

  /** Finished translations as original -> translation (failed ones excluded). */
  toMap(): Record<string, string> {
    const map: Record<string, string> = {};
    this.translations.forEach((t, i) => {
      if (t) map[this.cues[i]!.text] = t;
    });
    return map;
  }

  /** Start or move the work to time `t` (ms). */
  seek(t: number): void {
    if (this.stopped) return;
    this.cursor = firstCueFrom(this.cues, t);
    if (!this.running) void this.run();
  }

  stop(): void {
    this.stopped = true;
    this.abort.abort();
  }

  get done(): boolean {
    for (let i = 0; i < this.translations.length; i++) if (this.translations[i] === undefined) return false;
    return true;
  }

  private nextIndex(): number {
    const n = this.cues.length;
    for (let k = 0; k < n; k++) {
      const i = (this.cursor + k) % n; // ahead first, then wrap to earlier cues
      if (this.translations[i] === undefined) return i;
    }
    return -1;
  }

  private async run(): Promise<void> {
    this.running = true;
    try {
      for (let i = this.nextIndex(); i !== -1 && !this.stopped; i = this.nextIndex()) {
        this.cursor = i + 1;
        try {
          this.translations[i] = await this.translator.translate(this.cues[i]!.text, this.abort.signal);
        } catch (err) {
          if (this.stopped) return;
          this.translations[i] = ''; // do not retry forever; show original only
          this.onError(i, err);
          continue;
        }
        if (!this.stopped) this.onTranslated(i);
      }
    } finally {
      this.running = false;
    }
  }
}
