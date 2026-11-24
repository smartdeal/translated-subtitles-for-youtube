// Player-bar button: a subtitle icon with a small badge for the target language.
// Built with DOM calls, not innerHTML: YouTube enforces Trusted Types.
const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/** Subtitle frame with two lines: the original (dim) above the translation. */
function icon(): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 24 24', width: '24', height: '24', 'aria-hidden': 'true' });
  svg.append(
    svgEl('path', {
      fill: 'currentColor',
      'fill-rule': 'evenodd',
      // 22x18 frame, same footprint as YouTube's CC icon.
      d: 'M4 3h16a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4Z',
    }),
    svgEl('rect', { x: '5', y: '9.5', width: '9', height: '2', rx: '1', fill: 'currentColor', opacity: '0.55' }),
    svgEl('rect', { x: '5', y: '13.5', width: '14', height: '2', rx: '1', fill: 'currentColor' }),
  );
  return svg;
}

/** Short badge text: "RU", "ZH" for zh-Hant. */
export const badgeText = (lang: string) => (lang.split('-')[0] ?? lang).slice(0, 3).toUpperCase();

export function createPlayerButton(className: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `ytp-button ${className}`;
  btn.title = 'Translated subtitles';
  btn.setAttribute('aria-label', 'Translated subtitles');
  const badge = document.createElement('span');
  badge.className = 'tp-badge';
  btn.append(icon(), badge);
  btn.addEventListener('click', onClick);
  return btn;
}

export function updatePlayerButton(btn: HTMLButtonElement, lang: string, pressed: boolean): void {
  const badge = btn.querySelector('.tp-badge');
  const text = badgeText(lang);
  if (badge && badge.textContent !== text) badge.textContent = text;
  if (btn.getAttribute('aria-pressed') !== String(pressed)) btn.setAttribute('aria-pressed', String(pressed));
}
