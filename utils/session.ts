// One translated-subtitles session for one video: captions + queue + overlay.
import { findCueIndex, mergeFragments, parseJson3, type Cue } from './captions';
import { FROM_ISOLATED, FROM_MAIN, isFrom, type CaptionsResponse, type GetCaptionsRequest } from './messages';
import { Overlay } from './overlay';
import { cacheKey, type TranslationCache } from './cache';
import type { Settings } from './settings';
import { TranslationQueue } from './translation-queue';
import type { TextTranslator } from './translator';
import { captionsErrorText, TRANSLATION_FAILING } from './status-text';

const CAPTIONS_TIMEOUT_MS = 10_000;
const ERROR_SHOW_MS = 8000;
const FAILS_BEFORE_WARNING = 3;

function requestCaptions(videoId: string, lang: string): Promise<CaptionsResponse> {
  const requestId = crypto.randomUUID();
  return new Promise((resolve) => {
    // The MAIN-world script may be missing (e.g. extension reloaded without a page reload).
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMsg);
      resolve({ source: FROM_MAIN, type: 'captions-error', requestId, reason: 'timeout' });
    }, CAPTIONS_TIMEOUT_MS);
    const onMsg = (e: MessageEvent) => {
      if (!isFrom<CaptionsResponse>(e, FROM_MAIN) || e.data.requestId !== requestId) return;
      clearTimeout(timer);
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
  private failStreak = 0;
  private statusTimer = 0;
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
      this.showError(captionsErrorText(res.reason, this.settings.sourceLanguage, res.available));
      return;
    }
    const cues = parseJson3(res.json);
    this.cues = res.kind === 'asr' ? mergeFragments(cues) : cues;
    if (!this.cues.length) {
      this.showError(captionsErrorText('no-track', this.settings.sourceLanguage, []));
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
        this.failStreak = 0;
        this.scheduleSave();
      },
      (i, err) => {
        console.warn('[TP] translation failed for cue', i, err);
        if (++this.failStreak === FAILS_BEFORE_WARNING) this.showError(TRANSLATION_FAILING);
      },
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

  /** Show an error for a while, then hide it (the button stays on for the next video). */
  private showError(text: string): void {
    this.overlay.setStatus(text);
    clearTimeout(this.statusTimer);
    this.statusTimer = window.setTimeout(() => this.overlay.setStatus(''), ERROR_SHOW_MS);
  }

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
    clearTimeout(this.statusTimer);
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    this.video.removeEventListener('seeking', this.onSeek);
    this.queue?.stop();
    this.overlay.destroy();
  }
}
