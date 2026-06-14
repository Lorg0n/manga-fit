import { generateGenericSelector, generateSmartPattern, doesUrlMatch } from '@/utils/helpers';
import { browser, storage } from '#imports';
import type { Preset } from '@/utils/types';

let isPickingMode = false;
let activeEditingPresetId: string | null = null; 
let selectedElements: HTMLElement[] = [];
let hoveredElement: HTMLElement | null = null;
let controlPanel: HTMLDivElement | null = null;

function createControlPanel() {
  if (controlPanel) return;
  
  controlPanel = document.createElement('div');
  controlPanel.id = 'mangafit-picker-panel';
  controlPanel.innerHTML = `
    <div style="
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a1a;
      color: #fff;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 999999999;
      font-family: sans-serif;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 16px;
      border: 1px solid #13b4c4;
    ">
      <span><strong>MangaFit Picker:</strong> Hold <strong>Ctrl</strong> to select multiple panels, then click Done.</span>
      <button id="mangafit-btn-done" style="
        background: #13b4c4;
        color: #111;
        border: none;
        padding: 6px 16px;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
      ">Done</button>
      <button id="mangafit-btn-cancel" style="
        background: #444;
        color: #fff;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
      ">Cancel</button>
    </div>
  `;
  document.body.appendChild(controlPanel);

  document.getElementById('mangafit-btn-done')?.addEventListener('click', () => {
    finishPicking();
  });

  document.getElementById('mangafit-btn-cancel')?.addEventListener('click', () => {
    cancelPicking();
  });
}

function removeControlPanel() {
  if (controlPanel) {
    controlPanel.remove();
    controlPanel = null;
  }
}

export function initPicker() {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'START_PICKING') {
      isPickingMode = true;
      activeEditingPresetId = message.presetId || null; // Capture active edit profile context
      selectedElements = [];
      document.body.style.cursor = 'crosshair';
      createControlPanel();
      sendResponse({ status: 'started' });
    } else if (message.action === 'STOP_PICKING') {
      cancelPicking();
      sendResponse({ status: 'stopped' });
    }
  });

  document.addEventListener('mouseover', (e) => {
    if (!isPickingMode) return;
    const target = e.target as HTMLElement;
    
    if (controlPanel && controlPanel.contains(target)) return;

    if (target.tagName === 'IMG' && !selectedElements.includes(target)) {
      target.style.outline = '4px dashed #13b4c4';
      target.style.outlineOffset = '-4px';
      hoveredElement = target;
    }
  }, true);

  document.addEventListener('mouseout', (e) => {
    if (!isPickingMode || !hoveredElement) return;
    if (!selectedElements.includes(hoveredElement)) {
      hoveredElement.style.outline = '';
    }
    hoveredElement = null;
  }, true);

  document.addEventListener('click', (e) => {
    if (!isPickingMode) return;
    const target = e.target as HTMLElement;
    
    if (controlPanel && controlPanel.contains(target)) return;

    if (target.tagName !== 'IMG') return;

    e.preventDefault();
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey) {
      if (!selectedElements.includes(target)) {
        target.style.outline = '4px solid #65c449';
        selectedElements.push(target);
      }
    } else {
      if (selectedElements.length === 0) {
        selectedElements.push(target);
        finishPicking();
      } else {
        if (!selectedElements.includes(target)) {
          target.style.outline = '4px solid #65c449';
          selectedElements.push(target);
        }
      }
    }
  }, { capture: true });
}

function generateUniquePresetName(hostname: string, selector: string, existingPresets: Preset[]): string {
  let suffix = '';
  const lowerSelector = selector.toLowerCase();
  
  if (lowerSelector.includes('thumb')) {
    suffix = ' - Thumbnails';
  } else if (lowerSelector.includes('img') || lowerSelector.includes('image') || lowerSelector.includes('comic')) {
    suffix = ' - Images';
  } else {
    const cleanSel = selector.split(/[ >.#:]/).filter(Boolean).pop();
    if (cleanSel) {
      suffix = ` - ${cleanSel.charAt(0).toUpperCase() + cleanSel.slice(1)}`;
    }
  }

  const baseName = `${hostname}${suffix}`;
  let candidateName = baseName;
  let counter = 1;

  while (existingPresets.some(p => p.name === candidateName)) {
    counter++;
    candidateName = `${baseName} (${counter})`;
  }

  return candidateName;
}

async function finishPicking() {
  isPickingMode = false;
  document.body.style.cursor = '';
  
  const finalSelector = generateGenericSelector(selectedElements);

  selectedElements.forEach(el => el.style.outline = '');
  selectedElements = [];
  removeControlPanel();

  const currentUrl = window.location.href;
  const presets = await storage.getItem<Preset[]>('local:mangafit_presets') || [];
  const pattern = generateSmartPattern(currentUrl);
  
  let matched: Preset | undefined = undefined;

  // 1. If we are explicitly repicking for an existing preset, update that profile's selector
  if (activeEditingPresetId) {
    matched = presets.find(p => p.id === activeEditingPresetId);
    if (matched) {
      matched.selector = finalSelector;
      matched.enabled = true;
    }
  }

  // 2. Fallback to normal matching or appending a new profile if no edit context is provided
  if (!matched) {
    matched = presets.find(p => p.urlPattern === pattern && p.selector === finalSelector);
    if (matched) {
      matched.enabled = true;
    } else {
      const hostname = window.location.hostname;
      const uniqueName = generateUniquePresetName(hostname, finalSelector, presets);
      
      matched = {
        id: Date.now().toString(),
        name: uniqueName,
        urlPattern: pattern,
        selector: finalSelector,
        width: 100,
        enabled: true
      };
      presets.push(matched);
    }
  }
  
  activeEditingPresetId = null; // Clear context buffer
  await storage.setItem('local:mangafit_presets', presets);
  console.log('[MangaFit] Abstract selector generated:', finalSelector);
}

function cancelPicking() {
  isPickingMode = false;
  activeEditingPresetId = null;
  document.body.style.cursor = '';
  selectedElements.forEach(el => el.style.outline = '');
  selectedElements = [];
  removeControlPanel();
}