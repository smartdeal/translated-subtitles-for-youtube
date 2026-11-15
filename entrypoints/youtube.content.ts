// M0 spike, isolated world: a floating test button.
import { LOG, MSG_TEST_TRANSLATOR, testTranslator } from '../utils/spike-shared';

export default defineContentScript({
  matches: ['*://www.youtube.com/*'],
  main() {
    const btn = document.createElement('button');
    btn.id = 'tp-spike-btn';
    btn.textContent = 'TP spike';
    btn.style.cssText =
      'position:fixed;bottom:16px;left:16px;z-index:99999;padding:8px 12px;font:14px sans-serif;background:#c00;color:#fff;border:0;border-radius:6px;cursor:pointer';
    btn.addEventListener('click', () => {
      console.log(LOG, 'spike button clicked');
      void testTranslator('isolated');
      window.postMessage({ type: MSG_TEST_TRANSLATOR }, location.origin);
    });
    document.documentElement.append(btn);
    console.log(LOG, 'isolated content script loaded');
  },
});
