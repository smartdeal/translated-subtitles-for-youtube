import { describe, expect, it } from 'vitest';
import { ALL_PLAYERS_SELECTOR, parsePage, pickPlayer, PLAYER_SELECTOR } from '../utils/page';

const ID = 'q_As0l3Dyjo';

describe('parsePage', () => {
  it('reads watch pages', () => {
    expect(parsePage(`https://www.youtube.com/watch?v=${ID}&t=42s`)).toEqual({ kind: 'watch', videoId: ID });
  });

  it('reads Shorts, with or without a trailing slash or query', () => {
    expect(parsePage(`https://www.youtube.com/shorts/${ID}`)).toEqual({ kind: 'shorts', videoId: ID });
    expect(parsePage(`https://www.youtube.com/shorts/${ID}/?feature=share`)).toEqual({ kind: 'shorts', videoId: ID });
  });

  it('returns null for other pages and malformed ids', () => {
    for (const url of [
      'https://www.youtube.com/',
      'https://www.youtube.com/shorts',
      'https://www.youtube.com/feed/subscriptions',
      `https://www.youtube.com/embed/${ID}`,
      'https://www.youtube.com/watch',
      'https://www.youtube.com/watch?v=short',
      'https://www.youtube.com/watch?v=abc%22%3E%3Cxxxx',
      'https://www.youtube.com/shorts/abc/def',
      'not a url',
    ]) {
      expect(parsePage(url), url).toBeNull();
    }
  });
});

describe('player selectors', () => {
  it('has one selector per kind and a combined one', () => {
    expect(PLAYER_SELECTOR).toEqual({ watch: '#movie_player', shorts: '#shorts-player' });
    expect(ALL_PLAYERS_SELECTOR).toBe('#movie_player,#shorts-player');
  });
});

describe('pickPlayer', () => {
  const idOf = (p: { vid?: string }) => p.vid;

  it('picks the player that holds the requested video', () => {
    // Real case on a Shorts page: a hidden #movie_player with an older watch video comes first.
    const hidden = { vid: 'olderWatch1' };
    const shorts = { vid: ID };
    expect(pickPlayer([hidden, shorts], ID, idOf)).toBe(shorts);
  });

  it('returns undefined when no player has the video yet', () => {
    expect(pickPlayer([{ vid: 'otherVideo1' }, {}], ID, idOf)).toBeUndefined();
  });
});
