export function applyCustomStyle(selector: string, width: number) {
  const styleId = 'panelfit-custom-style';
  let styleTag = document.getElementById(styleId);
  
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = styleId;
    document.head.appendChild(styleTag);
  }
  
  styleTag.textContent = `
    ${selector} { 
      width: ${width}% !important; 
      height: auto !important; 
      max-width: none !important; 
      margin: 0 auto !important; 
      display: block !important; 
    }
  `;
}

export function removeCustomStyle() {
  const styleTag = document.getElementById('panelfit-custom-style');
  if (styleTag) styleTag.remove();
}