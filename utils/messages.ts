// window.postMessage protocol between the isolated content script and the
// MAIN-world script. Page scripts can read and fake these messages, so they
// carry only public caption data, and receivers treat it as untrusted text.
import type { Json3 } from './captions';

export const FROM_ISOLATED = 'tp-isolated';
export const FROM_MAIN = 'tp-main';

export interface GetCaptionsRequest {
  source: typeof FROM_ISOLATED;
  type: 'get-captions';
  requestId: string;
  videoId: string;
  /** Source language code, or 'auto' for the video's spoken language. */
  lang: string;
}

export type CaptionsResponse =
  | {
      source: typeof FROM_MAIN;
      type: 'captions';
      requestId: string;
      kind: 'asr' | 'manual';
      json: Json3;
      /** Normalized language of the chosen track. */
      sourceLanguage: string;
      /** Normalized spoken language of the video, if known. */
      spokenLanguage?: string;
    }
  | {
      source: typeof FROM_MAIN;
      type: 'captions-error';
      requestId: string;
      reason: CaptionsErrorReason;
      /** Caption languages the video does have (for 'no-track'). */
      available?: string[];
    };

export type CaptionsErrorReason = 'no-player' | 'no-track' | 'fetch-failed' | 'timeout' | 'unknown-language' | 'live';

export function isFrom<T extends { source: string }>(e: MessageEvent, source: T['source']): e is MessageEvent<T> {
  return e.source === window && e.origin === location.origin && e.data?.source === source;
}
