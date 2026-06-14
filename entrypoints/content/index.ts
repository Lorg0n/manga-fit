import { storage } from '#imports';
import { initPicker } from './picker';
import { applyCustomStyle, removeCustomStyle } from './resizer';
import { doesUrlMatch } from '@/utils/helpers';
import type { Preset } from '@/utils/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    initPicker();

    const currentUrl = window.location.href;

    const checkAndApplyPresets = async () => {
      const presets = await storage.getItem<Preset[]>('local:panelfit_presets') || [];
      
      const activePreset = presets.find(p => p.enabled && doesUrlMatch(currentUrl, p.urlPattern));

      if (activePreset && activePreset.selector) {
        applyCustomStyle(activePreset.selector, activePreset.width);
      } else {
        removeCustomStyle();
      }
    };

    checkAndApplyPresets();

    storage.watch<Preset[]>('local:panelfit_presets', () => {
      checkAndApplyPresets();
    });
  },
});