// M0 spike, main world: watch the player's own caption requests,
// try a direct caption fetch, and test Translator in the page world.
import { LOG, MSG_TEST_TRANSLATOR, testTranslator } from '../utils/spike-shared';

const isTimedText = (url: string) => url.includes('/api/timedtext');

function report(source: string, url: string, body: string): void {
  let events = -1;
  try {
    events = (JSON.parse(body).events ?? []).length;
  } catch {
    /* not json3 */
  }
  const pot = new URL(url, location.origin).searchParams.has('pot');
  console.log(LOG, `captions/${source}: ${body.length} bytes, json3 events=${events}, pot=${pot}`, url.slice(0, 200));
}

function patchFetch(): void {
  const orig = window.fetch;
  window.fetch = async function (input, init) {
    const res = await orig.call(this, input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (isTimedText(url)) {
      res.clone().text().then((b) => report('fetch', url, b), () => {});
    }
    return res;
  };
}

function patchXhr(): void {
  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest) {
    const u = String(arguments[1]);
    if (isTimedText(u)) {
      this.addEventListener('load', () => report('xhr', u, String(this.responseText ?? '')));
    }
    return open.apply(this, arguments as unknown as Parameters<typeof open>);
  } as typeof XMLHttpRequest.prototype.open;
}

async function tryDirectFetch(): Promise<void> {
  const player = document.querySelector('#movie_player') as (HTMLElement & { getPlayerResponse?: () => any }) | null;
  const tracks = player?.getPlayerResponse?.()?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks?.length) {
    console.log(LOG, 'captions/direct: no caption tracks in player response');
    return;
  }
  console.log(LOG, 'captions/direct: tracks =', tracks.map((t: any) => `${t.languageCode}${t.kind === 'asr' ? '(auto)' : ''}`).join(', '));
  const url = `${tracks[0].baseUrl}&fmt=json3`;
  try {
    const res = await fetch(url);
    report(`direct status=${res.status}`, url, await res.text());
  } catch (e) {
    console.log(LOG, 'captions/direct: ERROR', e);
  }
}

export default defineContentScript({
  matches: ['*://www.youtube.com/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    patchFetch();
    patchXhr();
    window.addEventListener('message', (e) => {
      if (e.source !== window || e.data?.type !== MSG_TEST_TRANSLATOR) return;
      void testTranslator('main');
      void tryDirectFetch();
    });
    console.log(LOG, 'main world script loaded');
  },
});
