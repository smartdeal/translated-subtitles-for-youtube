// Subtitle box drawn over the YouTube player. Text only (textContent).
import { PLAYER_SELECTOR } from './page';

const SHORTS = PLAYER_SELECTOR.shorts;
// Centered with left/right 0 + auto margins, not left:50% + translateX(-50%):
// that caps the box at half the player width and wraps short lines (Shorts).
const STYLE_ID = 'tp-style';
const CSS = `
.tp-overlay{position:absolute;left:0;right:0;margin:0 auto;bottom:12%;z-index:60;max-width:80%;
  text-align:center;pointer-events:none;font-family:"YouTube Noto",Roboto,Arial,sans-serif;line-height:1.3}
.tp-overlay>div{display:table;margin:2px auto;padding:2px 8px;background:rgba(8,8,8,.75);color:#fff;border-radius:3px;
  font-size:calc(clamp(14px,2.2vw,28px)*var(--tp-scale,1));white-space:pre-wrap}
.tp-overlay .tp-orig{color:#ddd;font-size:calc(clamp(12px,1.8vw,22px)*var(--tp-scale,1))}
.tp-overlay .tp-status{font-size:14px;color:#ffd666}
.tp-overlay>div:empty{display:none}
.ytp-autohide .tp-overlay{bottom:6%}
.tp-active .ytp-caption-window-container{display:none!important}
/* Shorts: narrow video; keep clear of the title/channel panel (bottom ~13%) and the progress bar. */
${SHORTS} .tp-overlay,${SHORTS}.ytp-autohide .tp-overlay{bottom:22%;max-width:90%}
${SHORTS} .tp-overlay>div{font-size:calc(clamp(15px,1.2vw,20px)*var(--tp-scale,1))}
${SHORTS} .tp-overlay .tp-orig{font-size:calc(clamp(13px,1vw,17px)*var(--tp-scale,1))}
${SHORTS} .tp-overlay .tp-status{font-size:13px}
.tp-button.ytp-button{display:inline-flex;align-items:center;justify-content:center;line-height:0;color:#fff;vertical-align:top}
.tp-button svg{width:24px;height:24px;opacity:.85;transition:opacity .1s}
.tp-button:hover svg,.tp-button[aria-pressed="true"] svg{opacity:1}
.tp-badge{position:absolute;top:6px;right:5px;padding:1px 3px;border-radius:2px;font:700 9px/1 Roboto,Arial,sans-serif;
  letter-spacing:.2px;color:#fff;background:#606060;pointer-events:none}
.tp-button[aria-pressed="true"] .tp-badge{background:#e1002d}
.tp-button.tp-shorts{pointer-events:auto;position:relative;width:48px;height:48px;padding:0;border:0;border-radius:50%;background:transparent;cursor:pointer}
.tp-button.tp-shorts:hover{background:rgba(255,255,255,.1)}
.tp-button.tp-shorts .tp-badge{top:8px;right:6px}
`;

export class Overlay {
  private readonly root = document.createElement('div');
  private readonly orig = document.createElement('div');
  private readonly tr = document.createElement('div');
  private readonly status = document.createElement('div');

  constructor(private readonly player: HTMLElement) {
    ensureStyle();
    this.root.className = 'tp-overlay';
    this.orig.className = 'tp-orig';
    this.tr.className = 'tp-tr';
    this.status.className = 'tp-status';
    this.root.append(this.status, this.orig, this.tr);
    player.append(this.root);
    player.classList.add('tp-active');
  }

  show(original: string, translation: string | undefined, showOriginal: boolean): void {
    this.orig.textContent = showOriginal || !translation ? original : '';
    this.tr.textContent = translation ?? (original ? '…' : '');
  }

  setScale(scale: number): void {
    this.root.style.setProperty('--tp-scale', String(scale));
  }

  setStatus(text: string): void {
    this.status.textContent = text;
  }

  destroy(): void {
    this.root.remove();
    this.player.classList.remove('tp-active');
  }
}

export function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.append(s);
}
