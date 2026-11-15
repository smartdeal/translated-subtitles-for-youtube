// M0 spike helpers, shared by the isolated and main world scripts.
export const LOG = '[TP]';
export const MSG_TEST_TRANSLATOR = 'tp-spike:test-translator';

export async function testTranslator(world: string): Promise<void> {
  const tag = `${LOG} translator/${world}:`;
  try {
    if (typeof Translator === 'undefined') {
      console.log(tag, 'Translator global is undefined');
      return;
    }
    const langs = { sourceLanguage: 'en', targetLanguage: 'ru' };
    console.log(tag, 'availability =', await Translator.availability(langs));
    const t0 = performance.now();
    const tr = await Translator.create({
      ...langs,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) =>
          console.log(tag, 'download', (e as ProgressEvent).loaded),
        );
      },
    });
    console.log(tag, 'created in', Math.round(performance.now() - t0), 'ms');
    const t1 = performance.now();
    const out = await tr.translate('Hello world, this is a subtitle test.');
    console.log(tag, 'OK:', out, `(${Math.round(performance.now() - t1)} ms)`);
    tr.destroy();
  } catch (e) {
    console.log(tag, 'ERROR', e);
  }
}
