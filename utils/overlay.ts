// Subtitle box drawn over the YouTube player. Text only (textContent).
const STYLE_ID = 'tp-style';
const CSS = `
.tp-overlay{position:absolute;left:50%;bottom:12%;transform:translateX(-50%);z-index:60;max-width:80%;
  text-align:center;pointer-events:none;font-family:"YouTube Noto",Roboto,Arial,sans-serif;line-height:1.3}
.tp-overlay>div{display:table;margin:2px auto;padding:2px 8px;background:rgba(8,8,8,.75);color:#fff;border-radius:3px;
  font-size:clamp(14px,2.2vw,28px);white-space:pre-wrap}
.tp-overlay .tp-orig{color:#ddd;font-size:clamp(12px,1.8vw,22px)}
.tp-overlay .tp-status{font-size:14px;color:#ffd666}
.tp-overlay>div:empty{display:none}
.ytp-autohide .tp-overlay{bottom:6%}
#movie_player.tp-active .ytp-caption-window-container{display:none!important}
.tp-button{font-weight:700;font-size:13px;color:#fff;opacity:.9;text-align:center;vertical-align:top}
.tp-button[aria-pressed="true"]{color:#3ea6ff;opacity:1}
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
