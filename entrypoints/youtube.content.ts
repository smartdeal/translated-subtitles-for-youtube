// Isolated world: player-bar button, translator, settings, and the subtitle session.
import { TranslationCache } from '../utils/cache';
import { localStore } from '../utils/cache-store';
import { ensureStyle, Overlay } from '../utils/overlay';
import { Session } from '../utils/session';
import { loadSettings, watchSettings, type Settings } from '../utils/settings';
import { createChromeTranslator, type TextTranslator } from '../utils/translator';

const BUTTON_CLASS = 'tp-button';

let enabled = false;
let settings: Settings;
let translator: TextTranslator | undefined;
let session: Session | undefined;
const cache = new TranslationCache(localStore);

const videoIdFromUrl = () => (location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') : null);
const button = () => document.querySelector<HTMLButtonElement>(`.${BUTTON_CLASS}`);

function playerParts() {
  const player = document.querySelector<HTMLElement>('#movie_player');
  const video = player?.querySelector<HTMLVideoElement>('video.html5-main-video');
  return player && video ? { player, video } : undefined;
}

function setEnabled(on: boolean): void {
  enabled = on;
  button()?.setAttribute('aria-pressed', String(on));
}

function stopSession(): void {
  session?.stop();
  session = undefined;
}

async function startSession(): Promise<void> {
  stopSession();
  const videoId = videoIdFromUrl();
  const parts = playerParts();
  if (!videoId || !parts || !translator) return;
  session = new Session(parts.player, parts.video, translator, settings, cache);
  await session.start(videoId);
}

async function onButtonClick(): Promise<void> {
  setEnabled(!enabled);
  if (!enabled) {
    stopSession();
    return;
  }
  if (!translator) {
    const parts = playerParts();
    const status = parts ? new Overlay(parts.player) : undefined;
    status?.setStatus('Preparing translator…');
    try {
      // Must run inside the click: the first create() needs a user gesture.
      translator = await createChromeTranslator(settings.sourceLanguage, settings.targetLanguage, (f) =>
        status?.setStatus(`Downloading translation model… ${Math.round(f * 100)}%`),
      );
    } catch (err) {
      status?.setStatus(err instanceof Error ? err.message : 'Translator failed to start.');
      setTimeout(() => status?.destroy(), 5000);
      setEnabled(false);
      return;
    }
    status?.destroy();
    if (!enabled) return; // turned off while the model was downloading
  }
  await startSession();
}

function ensureButton(): void {
  const existing = button();
  if (existing) {
    existing.textContent = settings.targetLanguage.toUpperCase();
    return;
  }
  const anchor = document.querySelector('#movie_player .ytp-subtitles-button');
  if (!anchor?.parentElement) return;
  ensureStyle();
  const btn = document.createElement('button');
  btn.className = `ytp-button ${BUTTON_CLASS}`;
  btn.title = 'Translated subtitles';
  btn.setAttribute('aria-label', 'Translated subtitles');
  btn.setAttribute('aria-pressed', String(enabled));
  btn.textContent = settings.targetLanguage.toUpperCase();
  btn.addEventListener('click', () => void onButtonClick());
  anchor.parentElement.insertBefore(btn, anchor);
}

function onSettingsChanged(next: Settings): void {
  const langChanged =
    next.sourceLanguage !== settings.sourceLanguage || next.targetLanguage !== settings.targetLanguage;
  settings = next;
  ensureButton();
  if (!langChanged) {
    session?.updateDisplay(next);
    return;
  }
  // A new language pair may need a model download, which needs a click.
  stopSession();
  translator?.destroy();
  translator = undefined;
  setEnabled(false);
}

export default defineContentScript({
  matches: ['*://www.youtube.com/*'],
  async main(ctx) {
    settings = await loadSettings();
    const unwatch = watchSettings(onSettingsChanged);

    // The player bar is built late and can be rebuilt; keep the button present.
    let pending = 0;
    const observer = new MutationObserver(() => {
      if (pending) return; // YouTube mutates a lot: check at most once per frame
      pending = requestAnimationFrame(() => {
        pending = 0;
        ensureButton();
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    ensureButton();

    // YouTube is a SPA: a new video does not reload the page.
    const onNavStart = () => stopSession();
    const onNavFinish = () => {
      if (enabled && videoIdFromUrl()) void startSession();
    };
    document.addEventListener('yt-navigate-start', onNavStart);
    document.addEventListener('yt-navigate-finish', onNavFinish);

    ctx.onInvalidated(() => {
      observer.disconnect();
      unwatch();
      document.removeEventListener('yt-navigate-start', onNavStart);
      document.removeEventListener('yt-navigate-finish', onNavFinish);
      stopSession();
      button()?.remove();
    });
  },
});
