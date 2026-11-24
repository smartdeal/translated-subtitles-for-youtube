import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Translated Subtitles for YouTube',
    // Store limit: 132 characters.
    description:
      'Shows YouTube subtitles translated into your language, side by side with the original. On-device translation, no account.',
    // Built-in Translator API ships in Chrome 138.
    minimum_chrome_version: '138',
    homepage_url: 'https://github.com/smartdeal/translated-subtitles-for-youtube',
    permissions: ['storage'],
  },
});
