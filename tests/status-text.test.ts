import { describe, expect, it } from 'vitest';
import { captionsErrorText, downloadText } from '../utils/status-text';

describe('captionsErrorText', () => {
  it('lists the languages a video has when the source one is missing', () => {
    expect(captionsErrorText('no-track', 'en', ['uk', 'de'])).toBe(
      'No English subtitles. This video has: Ukrainian, German. Change "From" in the extension popup.',
    );
  });

  it('shortens a long list and handles no subtitles at all', () => {
    const text = captionsErrorText('no-track', 'en', ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((x) => x + x));
    expect(text).toContain('+2 more');
    expect(captionsErrorText('no-track', 'en', [])).toBe('This video has no subtitles.');
  });

  it('has a text for every reason', () => {
    for (const r of ['no-player', 'fetch-failed', 'timeout'] as const) expect(captionsErrorText(r, 'en')).toBeTruthy();
  });

  it('says live streams are not supported yet', () => {
    expect(captionsErrorText('live', 'auto')).toBe('Live streams are not supported yet.');
  });
});

describe('downloadText', () => {
  it('shows a clamped percentage', () => {
    expect(downloadText(0.423)).toContain('42%');
    expect(downloadText(1.5)).toContain('100%');
  });
});
