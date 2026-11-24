// Loads one caption track as json3. Runs in the MAIN world.
// 1. Direct fetch of `baseUrl&fmt=json3` (works on /watch).
// 2. A copy of the player's own caption request, if one was intercepted.
// 3. On Shorts the direct fetch returns an empty body: the player's own request
//    carries a proof-of-origin token, so ask the player to load the track,
//    wait for the intercepted copy, then put the user's CC state back.
import type { Json3 } from './captions';
import { normalizeLang } from './language';

/** The parts of YouTube's player API used here. All optional: YouTube may drop them. */
export interface CaptionPlayer {
  loadModule?(module: string): void;
  getOption?(module: string, key: string): unknown;
  setOption?(module: string, key: string, value: unknown): void;
}

export interface TrackRef {
  languageCode: string;
  kind?: string;
}

export interface LoadTrackOptions {
  player: CaptionPlayer;
  track: TrackRef;
  /** Body of the direct json3 request. */
  fetchDirect: () => Promise<string>;
  /** The intercepted json3 of this video and language, if any. */
  intercepted: () => Json3 | undefined;
  timeoutMs?: number;
  pollMs?: number;
}

export type TrackChoice<T> =
  | { track: T; lang: string }
  | { error: 'no-track' | 'unknown-language'; available: string[] };

/**
 * The track to translate: `reqLang` ('auto' = the spoken language), manual
 * before ASR. A video with no tracks at all is 'no-track' even when its
 * language is unknown: "no subtitles" is the real reason.
 */
export function chooseTrack<T extends TrackRef>(all: T[], reqLang: string, spokenLanguage: string | undefined): TrackChoice<T> {
  const available = [...new Set(all.map((t) => t.languageCode))];
  if (!all.length) return { error: 'no-track', available };
  const lang = reqLang === 'auto' ? spokenLanguage : normalizeLang(reqLang);
  if (!lang) return { error: 'unknown-language', available };
  const tracks = all.filter((t) => normalizeLang(t.languageCode) === lang);
  const track = tracks.find((t) => t.kind !== 'asr') ?? tracks.find((t) => t.kind === 'asr');
  return track ? { track, lang } : { error: 'no-track', available };
}

export function parseJson3Text(text: string): Json3 | undefined {
  if (!text) return undefined;
  try {
    const json = JSON.parse(text) as Json3;
    return Array.isArray(json?.events) ? json : undefined;
  } catch {
    return undefined;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const hasLanguage = (v: unknown): boolean =>
  typeof v === 'object' && v !== null && typeof (v as TrackRef).languageCode === 'string' && !!(v as TrackRef).languageCode;

export async function loadTrackJson(o: LoadTrackOptions): Promise<Json3 | undefined> {
  const direct = await o.fetchDirect().then(parseJson3Text, () => undefined);
  if (direct) return direct;
  const known = o.intercepted();
  if (known) return known;

  const { player } = o;
  if (!player.setOption) return undefined;
  let before: unknown;
  try {
    before = player.getOption?.('captions', 'track');
    player.loadModule?.('captions');
    const req: TrackRef = { languageCode: o.track.languageCode };
    if (o.track.kind === 'asr') req.kind = 'asr';
    player.setOption('captions', 'track', req);
  } catch {
    return undefined;
  }

  const timeoutMs = o.timeoutMs ?? 5000;
  const pollMs = o.pollMs ?? 100;
  let json: Json3 | undefined;
  try {
    for (let waited = 0; waited <= timeoutMs; waited += pollMs) {
      json = o.intercepted();
      if (json) break;
      await sleep(pollMs);
    }
  } finally {
    try {
      // Turn CC back off, or back to the track the user had on.
      player.setOption('captions', 'track', hasLanguage(before) ? before : {});
    } catch {
      /* player gone (navigation): nothing to restore */
    }
  }
  return json;
}
