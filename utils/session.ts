// One translated-subtitles session for one video: captions + queue + overlay.
import { findCueIndex, mergeFragments, parseJson3, type Cue } from './captions';
import {
  FROM_ISOLATED,
  FROM_MAIN,
  isFrom,
  type CaptionsErrorReason,
  type CaptionsResponse,
  type GetCaptionsRequest,
} from './messages';
import { Overlay } from './overlay';
import { cacheKey, type TranslationCache } from './cache';
import type { Settings } from './settings';
import { TranslationQueue } from './translation-queue';
import type { TextTranslator } from './translator';

const ERROR_TEXT: Record<CaptionsErrorReason, string> = {
  'no-player': 'Player not ready. Try again.',
  'no-track': 'This video has no subtitles in the source language.',
  'fetch-failed': 'Could not load subtitles. Turn on CC once, then try again.',
};

function requestCaptions(videoId: string, lang: string): Promise<CaptionsResponse> {
  const requestId = crypto.randomUUID();
  return new Promise((resolve) => {
    const onMsg = (e: MessageEvent) => {
      if (!isFrom<CaptionsResponse>(e, FROM_MAIN) || e.data.requestId !== requestId) return;
      window.removeEventListener('message', onMsg);
      resolve(e.data);
    };
    window.addEventListener('message', onMsg);
    const req: GetCaptionsRequest = { source: FROM_ISOLATED, type: 'get-captions', requestId, videoId, lang };
    window.postMessage(req, location.origin);
  });
}

export class Session {
  private overlay: Overlay;
  private queue?: TranslationQueue;
  private cues: Cue[] = [];
  private raf = 0;
  private shown = '';
  private stopped = false;
  private cacheKey = '';
  private saveTimer = 0;
  private dirty = false;
  private readonly onSeek = () => this.queue?.seek(this.video.currentTime * 1000);

  constructor(
    private readonly player: HTMLElement,
    private readonly video: HTMLVideoElement,
    private readonly translator: TextTranslator,
    private settings: Settings,
    private readonly cache?: TranslationCache,
  ) {
    this.overlay = new Overlay(player);
    this.overlay.setScale(settings.fontScale);
  }

  /** Display settings apply live; a language change needs a new session. */
  updateDisplay(settings: Settings): void {
    this.settings = settings;
    this.overlay.setScale(settings.fontScale);
    this.shown = '';
  }

  async start(videoId: string): Promise<void> {
    this.overlay.setStatus('Loading subtitles…');
    const res = await requestCaptions(videoId, this.settings.sourceLanguage);
    if (this.stopped) return;
    if (res.type === 'captions-error') {
      this.overlay.setStatus(ERROR_TEXT[res.reason]);
      return;
    }
    const cues = parseJson3(res.json);
    this.cues = res.kind === 'asr' ? mergeFragments(cues) : cues;
    if (!this.cues.length) {
      this.overlay.setStatus(ERROR_TEXT['no-track']);
      return;
    }
    this.cacheKey = cacheKey(videoId, this.settings.sourceLanguage, this.settings.targetLanguage);
    const known = (await this.cache?.load(this.cacheKey).catch(() => ({}))) ?? {};
    if (this.stopped) return;
    this.overlay.setStatus('');
    this.queue = new TranslationQueue(
      this.cues,
      this.translator,
      () => {
        this.shown = ''; // force a redraw when a translation arrives
        this.scheduleSave();
      },
      (i, err) => console.warn('[TP] translation failed for cue', i, err),
      known,
    );
    this.video.addEventListener('seeking', this.onSeek);
    this.onSeek();
    this.tick();
  }

  private tick = (): void => {
    if (this.stopped) return;
    const i = findCueIndex(this.cues, this.video.currentTime * 1000);
    const original = i >= 0 ? this.cues[i]!.text : '';
    const translation = i >= 0 ? this.queue?.translations[i] : '';
    const key = `${i}|${translation ?? ''}`;
    if (key !== this.shown) {
      this.shown = key;
      // '' = translation failed: show() then falls back to the original line.
      this.overlay.show(original, translation, this.settings.display === 'dual');
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  /** Write to storage at most every few seconds, not per line. */
  private scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = window.setTimeout(() => this.flush(), 5000);
  }

  private flush(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = 0;
    if (!this.dirty || !this.queue || !this.cache) return;
    this.dirty = false;
    void this.cache.save(this.cacheKey, this.queue.toMap()).catch((e) => console.warn('[TP] cache save failed', e));
  }

  stop(): void {
    this.flush();
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    this.video.removeEventListener('seeking', this.onSeek);
    this.queue?.stop();
    this.overlay.destroy();
  }
}
