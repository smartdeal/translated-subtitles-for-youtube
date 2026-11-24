// Isolated world: player-bar button, translators, settings, and the subtitle session.
import { TranslationCache } from '../utils/cache';
import { localStore } from '../utils/cache-store';
import { ensureStyle } from '../utils/overlay';
import { badgeText, createPlayerButton, updatePlayerButton } from '../utils/player-button';
import { Session, type GetTranslator } from '../utils/session';
import { BUTTON_ANCHOR_SELECTOR, parsePage, PLAYER_SELECTOR, type PageKind } from '../utils/page';
import { loadSettings, watchSettings, type Settings } from '../utils/settings';
import { needsClickText } from '../utils/status-text';
import { createChromeTranslator, type TextTranslator } from '../utils/translator';

const BUTTON_CLASS = 'tp-button';
const NEEDS_CLICK_SHOW_MS = 8000;

let enabled = false;
let settings: Settings;
let session: Session | undefined;
const cache = new TranslationCache(localStore);

/** One translator per language pair; with From = Auto, videos can need different pairs. */
const translators = new Map<string, Promise<TextTranslator>>();

const getTranslator: GetTranslator = (from, to, onProgress) => {
  const key = `${from}>${to}`;
  let t = translators.get(key);
  if (!t) {
    t = createChromeTranslator(from, to, onProgress);
    translators.set(key, t);
    t.catch(() => translators.delete(key)); // retry next time (e.g. after a click)
  }
  return t;
};

function dropTranslators(): void {
  for (const t of translators.values()) t.then((x) => x.destroy(), () => {});
  translators.clear();
}

const currentPage = () => parsePage(location.href);
const button = () => document.querySelector<HTMLButtonElement>(`.${BUTTON_CLASS}`);
const buttonLabel = () => `the ${badgeText(settings.targetLanguage)} subtitles button`;

function playerParts(kind: PageKind) {
  const player = document.querySelector<HTMLElement>(PLAYER_SELECTOR[kind]);
  const video = player?.querySelector<HTMLVideoElement>('video.html5-main-video');
  return player && video ? { player, video } : undefined;
}

function setEnabled(on: boolean): void {
  enabled = on;
  const btn = button();
  if (btn) updatePlayerButton(btn, settings.targetLanguage, on);
}

function stopSession(): void {
  session?.stop();
  session = undefined;
}

/** A new model must be downloaded, and Chrome allows that only right after a click. */
function onNeedsClick(from: string, to: string): void {
  const s = session;
  setEnabled(false);
  s?.showError(needsClickText(from, to, buttonLabel()));
  setTimeout(() => {
    if (session === s && !enabled) stopSession();
  }, NEEDS_CLICK_SHOW_MS);
}

async function startSession(): Promise<void> {
  stopSession();
  const page = currentPage();
  const parts = page && playerParts(page.kind);
  if (!page || !parts) return;
  session = new Session(parts.player, parts.video, getTranslator, settings, cache, onNeedsClick);
  // When started from a click, the translator is created within Chrome's
  // user-activation window, so a first model download is allowed.
  await session.start(page.videoId);
}

function onButtonClick(): void {
  setEnabled(!enabled);
  if (enabled) void startSession();
  else stopSession();
}

/** One button, moved to the native CC button of the current page (watch or Shorts). */
function ensureButton(): void {
  const page = currentPage();
  const anchor = page && document.querySelector(BUTTON_ANCHOR_SELECTOR[page.kind]);
  let btn = button();
  if (page && anchor?.parentElement && btn?.nextElementSibling !== anchor) {
    ensureStyle();
    btn ??= createPlayerButton(BUTTON_CLASS, onButtonClick);
    btn.classList.toggle('tp-shorts', page.kind === 'shorts');
    anchor.parentElement.insertBefore(btn, anchor);
  }
  if (btn) updatePlayerButton(btn, settings.targetLanguage, enabled);
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
  dropTranslators();
  // Restart with the new pair. If it needs a model download, the session asks for a click.
  if (enabled && currentPage()) void startSession();
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
      if (enabled && currentPage()) void startSession();
    };
    document.addEventListener('yt-navigate-start', onNavStart);
    document.addEventListener('yt-navigate-finish', onNavFinish);

    ctx.onInvalidated(() => {
      observer.disconnect();
      unwatch();
      document.removeEventListener('yt-navigate-start', onNavStart);
      document.removeEventListener('yt-navigate-finish', onNavFinish);
      stopSession();
      dropTranslators();
      button()?.remove();
    });
  },
});
