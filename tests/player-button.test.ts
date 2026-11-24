import { describe, expect, it } from 'vitest';
import { badgeText } from '../utils/player-button';

describe('badgeText', () => {
  it('shows the base language in capitals', () => {
    expect(badgeText('ru')).toBe('RU');
    expect(badgeText('zh-Hant')).toBe('ZH');
  });
});
