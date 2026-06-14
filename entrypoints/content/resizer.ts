import type { Preset } from '@/utils/types';

export function applyCustomStyles(activePresets: Preset[]) {
  const styleId = 'panelfit-custom-style';
  let styleTag = document.getElementById(styleId);
  
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = styleId;
    document.head.appendChild(styleTag);
  }
  
  let cssContent = '';
  for (const preset of activePresets) {
    if (!preset.selector || !preset.enabled) continue;
    
    cssContent += `
      /* Adaptive sizing for targeted container wrapper */
      ${preset.selector} { 
        width: ${preset.width}% !important; 
        height: auto !important; 
        max-width: none !important; 
        margin-left: auto !important; 
        margin-right: auto !important; 
      }
      
      /* Scale any inner images inside this targeted container wrapper */
      ${preset.selector} img {
        width: 100% !important;
        height: auto !important;
        max-width: 100% !important;
        display: block !important;
      }
    `;
  }
  
  styleTag.textContent = cssContent;
}

export function removeCustomStyle() {
  const styleTag = document.getElementById('panelfit-custom-style');
  if (styleTag) styleTag.remove();
}