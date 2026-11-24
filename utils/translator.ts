// Translation engines. UI and scheduling code depend only on this interface.

export interface TextTranslator {
  translate(text: string, signal?: AbortSignal): Promise<string>;
  destroy(): void;
}

export class TranslatorUnavailableError extends Error {}

/**
 * Chrome built-in Translator API (Chrome 138+, desktop).
 * Call from a click handler: the first create() needs a user gesture
 * while the language model is still downloadable.
 */
export async function createChromeTranslator(
  sourceLanguage: string,
  targetLanguage: string,
  onDownloadProgress?: (fraction: number) => void,
): Promise<TextTranslator> {
  if (typeof Translator === 'undefined') {
    throw new TranslatorUnavailableError('Chrome Translator API is not available (needs desktop Chrome 138+).');
  }
  const langs = { sourceLanguage, targetLanguage };
  if (sourceLanguage === targetLanguage) {
    throw new TranslatorUnavailableError('"From" and "To" are the same language. Change one in the extension popup.');
  }
  if ((await Translator.availability(langs)) === 'unavailable') {
    throw new TranslatorUnavailableError(
      `Chrome cannot translate ${sourceLanguage} -> ${targetLanguage}. Pick another pair in the extension popup.`,
    );
  }
  const t = await Translator.create({
    ...langs,
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => onDownloadProgress?.((e as ProgressEvent).loaded));
    },
  });
  return {
    translate: (text, signal) => t.translate(text, { signal }),
    destroy: () => t.destroy(),
  };
}
