// Minimal types for Chrome's built-in Translator API (Chrome 138+).
// https://developer.chrome.com/docs/ai/translator-api
type TranslatorAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface TranslatorLanguages {
  sourceLanguage: string;
  targetLanguage: string;
}

interface TranslatorInstance {
  translate(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}

interface TranslatorCreateOptions extends TranslatorLanguages {
  monitor?: (m: EventTarget) => void;
  signal?: AbortSignal;
}

declare var Translator:
  | {
      availability(langs: TranslatorLanguages): Promise<TranslatorAvailability>;
      create(options: TranslatorCreateOptions): Promise<TranslatorInstance>;
    }
  | undefined;
