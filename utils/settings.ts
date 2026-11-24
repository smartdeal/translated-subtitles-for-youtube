// Defaults. Language codes live here only; M2 moves them to the popup.
export interface Settings {
  sourceLanguage: string;
  targetLanguage: string;
  display: 'dual' | 'translation';
}

export const DEFAULT_SETTINGS: Settings = {
  sourceLanguage: 'en',
  targetLanguage: 'ru',
  display: 'dual',
};
