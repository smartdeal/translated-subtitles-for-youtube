// Isolated world: player-bar button, translator, and the subtitle session.
import { ensureStyle, Overlay } from '../utils/overlay';
import { Session } from '../utils/session';
import { DEFAULT_SETTINGS } from '../utils/settings';
import { createChromeTranslator, type TextTranslator } from '../utils/translator';

const BUTTON_CLASS = 'tp-button';

let enabled = false;
let translator: TextTranslator | undefined;
let session: Session | undefined;

const videoIdFromUrl = () => (location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') : null);

function playerParts() {
  const player = document.querySelector<HTMLElement>('#movie_player');
  const video = player?.querySelector<HTMLVideoElement>('video.html5-main-video');
  return player && video ? { player, video } : undefined;
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
  session = new Session(parts.player, parts.video, translator, DEFAULT_SETTINGS);
  await session.start(videoId);
}

async function onButtonClick(btn: HTMLButtonElement): Promise<void> {
  enabled = !enabled;
  btn.setAttribute('aria-pressed', String(enabled));
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
      translator = await createChromeTranslator(DEFAULT_SETTINGS.sourceLanguage, DEFAULT_SETTINGS.targetLanguage, (f) =>
        status?.setStatus(`Downloading translation model… ${Math.round(f * 100)}%`),
      );
    } catch (err) {
      status?.setStatus(err instanceof Error ? err.message : 'Translator failed to start.');
      setTimeout(() => status?.destroy(), 5000);
      enabled = false;
      btn.setAttribute('aria-pressed', 'false');
      return;
    }
    status?.destroy();
    if (!enabled) return; // turned off while the model was downloading
  }
  await startSession();
}

function ensureButton(): void {
  if (document.querySelector(`.${BUTTON_CLASS}`)) return;
  const anchor = document.querySelector('#movie_player .ytp-subtitles-button');
  if (!anchor?.parentElement) return;
  ensureStyle();
  const btn = document.createElement('button');
  btn.className = `ytp-button ${BUTTON_CLASS}`;
  btn.title = 'Translated subtitles';
  btn.setAttribute('aria-label', 'Translated subtitles');
  btn.setAttribute('aria-pressed', String(enabled));
  btn.textContent = DEFAULT_SETTINGS.targetLanguage.toUpperCase();
  btn.addEventListener('click', () => void onButtonClick(btn));
  anchor.parentElement.insertBefore(btn, anchor);
}

export default defineContentScript({
  matches: ['*://www.youtube.com/*'],
  main(ctx) {
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
    ctx.onInvalidated(() => {
      observer.disconnect();
      stopSession();
      document.querySelector(`.${BUTTON_CLASS}`)?.remove();
    });
    ensureButton();

    // YouTube is a SPA: a new video does not reload the page.
    document.addEventListener('yt-navigate-start', stopSession);
    document.addEventListener('yt-navigate-finish', () => {
      if (enabled && videoIdFromUrl()) void startSession();
    });
  },
});
