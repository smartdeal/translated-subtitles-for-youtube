import { LANGUAGES, loadSettings, saveSettings, type Settings } from '../../utils/settings';

const form = document.querySelector<HTMLFormElement>('#form')!;
const scaleOut = document.querySelector<HTMLOutputElement>('#scaleOut')!;
const hint = document.querySelector<HTMLElement>('#hint')!;
const names = new Intl.DisplayNames([navigator.language, 'en'], { type: 'language' });

function fillLanguages(select: HTMLSelectElement, value: string): void {
  const codes: string[] = [...LANGUAGES];
  if (!codes.includes(value)) codes.push(value);
  const opts = codes
    .map((code) => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name));
  select.replaceChildren(...opts.map((o) => new Option(`${o.name} (${o.code})`, o.code, false, o.code === value)));
}

function read(): Settings {
  const d = new FormData(form);
  return {
    sourceLanguage: String(d.get('sourceLanguage')),
    targetLanguage: String(d.get('targetLanguage')),
    display: d.get('display') === 'translation' ? 'translation' : 'dual',
    fontScale: Number(d.get('fontScale')),
  };
}

async function init(): Promise<void> {
  const s = await loadSettings();
  fillLanguages(form.elements.namedItem('sourceLanguage') as HTMLSelectElement, s.sourceLanguage);
  fillLanguages(form.elements.namedItem('targetLanguage') as HTMLSelectElement, s.targetLanguage);
  (form.querySelector(`input[name="display"][value="${s.display}"]`) as HTMLInputElement).checked = true;
  (form.elements.namedItem('fontScale') as HTMLInputElement).value = String(s.fontScale);
  scaleOut.textContent = `${Math.round(s.fontScale * 100)}%`;

  let saved = s;
  form.addEventListener('input', () => {
    const next = read();
    scaleOut.textContent = `${Math.round(next.fontScale * 100)}%`;
    if (next.sourceLanguage !== saved.sourceLanguage || next.targetLanguage !== saved.targetLanguage) hint.hidden = false;
    saved = next;
    void saveSettings(next);
  });
}

void init();
