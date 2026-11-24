// MAIN world: has access to YouTube's player object. Finds the caption
// track for the requested language and returns it as json3 (see
// utils/caption-fetch.ts for the direct fetch and its fallbacks).
import { chooseTrack, loadTrackJson, parseJson3Text, type CaptionPlayer } from '../utils/caption-fetch';
import type { Json3 } from '../utils/captions';
import { detectSpokenLanguage, normalizeLang, type PlayerLanguageData } from '../utils/language';
import { ALL_PLAYERS_SELECTOR, pickPlayer } from '../utils/page';
import { FROM_ISOLATED, FROM_MAIN, isFrom, type CaptionsResponse, type GetCaptionsRequest } from '../utils/messages';

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}
interface PlayerElement extends HTMLElement, CaptionPlayer {
  getPlayerResponse?: () => {
    streamingData?: PlayerLanguageData['streamingData'];
    videoDetails?: { videoId?: string };
    captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
  };
}

/** Player's own json3 caption responses, keyed by `videoId|lang`. */
const intercepted = new Map<string, Json3>();

function remember(url: string, body: string): void {
  const json = parseJson3Text(body);
  if (!json) return;
  try {
    const u = new URL(url, location.origin);
    intercepted.set(`${u.searchParams.get('v')}|${normalizeLang(u.searchParams.get('lang') ?? '')}`, json);
  } catch {
    /* bad URL: ignore */
  }
}

const isTimedText = (url: string) => url.includes('/api/timedtext');

function patchNetwork(): void {
  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const res = await origFetch.call(this, input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (isTimedText(url)) res.clone().text().then((b) => remember(url, b), () => {});
    return res;
  };
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest) {
    const url = String(arguments[1]);
    if (isTimedText(url)) this.addEventListener('load', () => remember(url, String(this.responseText ?? '')));
    return origOpen.apply(this, arguments as unknown as Parameters<typeof origOpen>);
  } as typeof origOpen;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** After SPA navigation the player may still hold the previous video for a moment. */
async function playerFor(videoId: string) {
  for (let i = 0; i < 25; i++) {
    const players = document.querySelectorAll<PlayerElement>(ALL_PLAYERS_SELECTOR);
    const player = pickPlayer(players, videoId, (p) => p.getPlayerResponse?.()?.videoDetails?.videoId);
    const resp = player?.getPlayerResponse?.();
    if (player && resp) return { player, resp };
    await sleep(200);
  }
  return undefined;
}

async function getCaptions(req: GetCaptionsRequest): Promise<CaptionsResponse> {
  const base = { source: FROM_MAIN, requestId: req.requestId } as const;
  const found = await playerFor(req.videoId);
  if (!found) return { ...base, type: 'captions-error', reason: 'no-player' };
  const { player, resp } = found;

  const all = resp.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  const spokenLanguage = detectSpokenLanguage(resp);
  const choice = chooseTrack(all, req.lang, spokenLanguage);
  if ('error' in choice) return { ...base, type: 'captions-error', reason: choice.error, available: choice.available };
  const { track, lang } = choice;
  const ok = { ...base, type: 'captions', kind: track.kind === 'asr' ? 'asr' : 'manual', sourceLanguage: lang, spokenLanguage } as const;

  const json = await loadTrackJson({
    player,
    track,
    fetchDirect: async () => {
      const res = await fetch(`${track.baseUrl}&fmt=json3`, { credentials: 'include' });
      return res.ok ? res.text() : '';
    },
    intercepted: () => intercepted.get(`${req.videoId}|${lang}`),
  });
  if (json) return { ...ok, json };
  return { ...base, type: 'captions-error', reason: 'fetch-failed' };
}

export default defineContentScript({
  matches: ['*://www.youtube.com/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    patchNetwork();
    window.addEventListener('message', (e) => {
      if (!isFrom<GetCaptionsRequest>(e, FROM_ISOLATED) || e.data.type !== 'get-captions') return;
      void getCaptions(e.data).then((msg) => window.postMessage(msg, location.origin));
    });
  },
});
