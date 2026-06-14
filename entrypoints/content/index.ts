import { storage } from '#imports';
import { initPicker } from './picker';
import { applyCustomStyles, removeCustomStyle } from './resizer';
import { doesUrlMatch } from '@/utils/helpers';
import type { Preset } from '@/utils/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    initPicker();

    const currentUrl = window.location.href;
    let previewPreset: Preset | null = null;

    const checkAndApplyPresets = async () => {
      const presets = await storage.getItem<Preset[]>('local:mangafit_presets') || [];
      
      // Filter out all enabled presets that match the current page pattern
      let activePresets = presets.filter(p => p.enabled && doesUrlMatch(currentUrl, p.urlPattern));

      // Merge real-time edits from popup preview if active
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
        if (doesUrlMatch(currentUrl, message.preset.urlPattern)) {
          previewPreset = message.preset;
          checkAndApplyPresets();
        }
      } else if (message.action === 'CLEAR_PREVIEW') {
        previewPreset = null;
        checkAndApplyPresets();
      }
    });
  },
});