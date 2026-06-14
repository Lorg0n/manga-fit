import { storage } from '#imports';
import { initPicker } from './picker';
import { applyCustomStyles, removeCustomStyle } from './resizer';
import { doesUrlMatch } from '@/utils/helpers';
import type { Preset } from '@/utils/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    initPicker();

    let previewPreset: Preset | null = null;
    let lastUrl = window.location.href;

    const checkAndApplyPresets = async () => {
      const currentUrl = window.location.href;
      const presets = await storage.getItem<Preset[]>('local:mangafit_presets') || [];

      let activePresets = presets.filter(p => p.enabled && doesUrlMatch(currentUrl, p.urlPattern));

      if (previewPreset) {
        const hasDraftId = activePresets.some(p => p.id === previewPreset!.id);
        if (hasDraftId) {
          activePresets = activePresets.map(p => p.id === previewPreset!.id ? previewPreset! : p);
        } else {
          activePresets.push(previewPreset);
        }
      }

      if (activePresets.length > 0) {
        applyCustomStyles(activePresets);
      } else {
        removeCustomStyle();
      }
    };

    checkAndApplyPresets();


    storage.watch<Preset[]>('local:mangafit_presets', () => {
      checkAndApplyPresets();
    });

    browser.runtime.onMessage.addListener((message) => {
      if (message.action === 'APPLY_PREVIEW') {
        const currentUrl = window.location.href;
        if (doesUrlMatch(currentUrl, message.preset.urlPattern)) {
          previewPreset = message.preset;
          checkAndApplyPresets();
        }
      } else if (message.action === 'CLEAR_PREVIEW') {
        previewPreset = null;
        checkAndApplyPresets();
      }
    });

    const spaObserver = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        checkAndApplyPresets();
      }
    });

    spaObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    window.addEventListener('popstate', () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        checkAndApplyPresets();
      }
    });
  },
});