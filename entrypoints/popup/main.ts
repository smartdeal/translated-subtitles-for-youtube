import { AUTO, LANGUAGES, loadSettings, saveSettings, type Settings } from '../../utils/settings';

const form = document.querySelector<HTMLFormElement>('#form')!;
const scaleOut = document.querySelector<HTMLOutputElement>('#scaleOut')!;
const names = new Intl.DisplayNames([navigator.language, 'en'], { type: 'language' });

function fillLanguages(select: HTMLSelectElement, value: string, withAuto = false): void {
  const codes: string[] = [...LANGUAGES];
  if (value !== AUTO && !codes.includes(value)) codes.push(value);
  const opts = codes
    .map((code) => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const options = opts.map((o) => new Option(`${o.name} (${o.code})`, o.code, false, o.code === value));
  if (withAuto) options.unshift(new Option('Auto (language of the video)', AUTO, false, value === AUTO));
  select.replaceChildren(...options);
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
  fillLanguages(form.elements.namedItem('sourceLanguage') as HTMLSelectElement, s.sourceLanguage, true);
  fillLanguages(form.elements.namedItem('targetLanguage') as HTMLSelectElement, s.targetLanguage);
  (form.querySelector(`input[name="display"][value="${s.display}"]`) as HTMLInputElement).checked = true;
  (form.elements.namedItem('fontScale') as HTMLInputElement).value = String(s.fontScale);
  scaleOut.textContent = `${Math.round(s.fontScale * 100)}%`;

  form.addEventListener('input', () => {
    const next = read();
    scaleOut.textContent = `${Math.round(next.fontScale * 100)}%`;
    void saveSettings(next);
  });
}

void init();
