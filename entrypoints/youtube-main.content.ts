// MAIN world: has access to YouTube's player object. Finds the caption
// track for the requested language and returns it as json3. If a direct
// fetch fails (e.g. YouTube starts to require a proof-of-origin token),
// falls back to the response of the player's own caption request.
import type { Json3 } from '../utils/captions';
import { FROM_ISOLATED, FROM_MAIN, isFrom, type CaptionsResponse, type GetCaptionsRequest } from '../utils/messages';

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}
interface PlayerElement extends HTMLElement {
  getPlayerResponse?: () => {
    videoDetails?: { videoId?: string };
    captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
  };
}

/** Player's own json3 caption responses, keyed by `videoId|lang`. */
const intercepted = new Map<string, Json3>();

function remember(url: string, body: string): void {
  try {
    const u = new URL(url, location.origin);
    const json = JSON.parse(body) as Json3;
    if (!Array.isArray(json.events)) return;
    intercepted.set(`${u.searchParams.get('v')}|${baseLang(u.searchParams.get('lang') ?? '')}`, json);
  } catch {
    /* not json3: ignore */
  }
}

const isTimedText = (url: string) => url.includes('/api/timedtext');
const baseLang = (code: string) => code.split('-')[0]!.toLowerCase();

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
async function playerResponseFor(videoId: string) {
  for (let i = 0; i < 25; i++) {
    const player = document.querySelector<PlayerElement>('#movie_player');
    const resp = player?.getPlayerResponse?.();
    if (resp?.videoDetails?.videoId === videoId) return resp;
    await sleep(200);
  }
  return undefined;
}

async function getCaptions(req: GetCaptionsRequest): Promise<CaptionsResponse> {
  const base = { source: FROM_MAIN, requestId: req.requestId } as const;
  const resp = await playerResponseFor(req.videoId);
  if (!resp) return { ...base, type: 'captions-error', reason: 'no-player' };

  const tracks = (resp.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []).filter(
    (t) => baseLang(t.languageCode) === req.lang,
  );
  const track = tracks.find((t) => t.kind !== 'asr') ?? tracks.find((t) => t.kind === 'asr');
  if (!track) return { ...base, type: 'captions-error', reason: 'no-track' };
  const kind = track.kind === 'asr' ? 'asr' : 'manual';

  try {
    const res = await fetch(`${track.baseUrl}&fmt=json3`, { credentials: 'include' });
    const text = await res.text();
    if (res.ok && text) {
      const json = JSON.parse(text) as Json3;
      if (Array.isArray(json.events)) return { ...base, type: 'captions', kind, json };
    }
  } catch {
    /* fall through to the intercepted copy */
  }
  const json = intercepted.get(`${req.videoId}|${req.lang}`);
  if (json) return { ...base, type: 'captions', kind, json };
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
