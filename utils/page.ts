// Which YouTube page we are on and where its player is. YouTube changes
// these often: keep URL patterns and player selectors in this module only.
export type PageKind = 'watch' | 'shorts';

export interface YouTubePage {
  kind: PageKind;
  videoId: string;
}

const VIDEO_ID = /^[\w-]{11}$/;
const SHORTS_PATH = /^\/shorts\/([\w-]{11})\/?$/;

export function parsePage(href: string): YouTubePage | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.pathname === '/watch') {
    const id = url.searchParams.get('v');
    return id && VIDEO_ID.test(id) ? { kind: 'watch', videoId: id } : null;
  }
  const m = SHORTS_PATH.exec(url.pathname);
  return m ? { kind: 'shorts', videoId: m[1]! } : null;
}

/** Player element per page kind. On Shorts a hidden 0x0 `#movie_player` also exists. */
export const PLAYER_SELECTOR: Readonly<Record<PageKind, string>> = {
  watch: '#movie_player',
  shorts: '#shorts-player',
};

export const ALL_PLAYERS_SELECTOR = Object.values(PLAYER_SELECTOR).join(',');

/**
 * The player that holds `videoId`. Matching by id (not by selector) skips the
 * hidden player that may still hold an older video.
 */
export function pickPlayer<T>(players: Iterable<T>, videoId: string, idOf: (p: T) => string | undefined): T | undefined {
  for (const p of players) if (idOf(p) === videoId) return p;
  return undefined;
}
