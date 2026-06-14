import { generateGenericSelector, generateSmartPattern, doesUrlMatch } from '@/utils/helpers';
import { browser, storage } from '#imports';
import type { Preset } from '@/utils/types';

let isPickingMode = false;
let selectedElements: HTMLElement[] = [];
let hoveredElement: HTMLElement | null = null;
let controlPanel: HTMLDivElement | null = null;

function createControlPanel() {
  if (controlPanel) return;
  
  controlPanel = document.createElement('div');
  controlPanel.id = 'panelfit-picker-panel';
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
      border: 1px solid #67D55E;
    ">
      <span><strong>PanelFit Picker:</strong> Hold <strong>Ctrl</strong> to select multiple panels, then click Done.</span>
      <button id="panelfit-btn-done" style="
        background: #67D55E;
        color: #111;
        border: none;
        padding: 6px 16px;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
      ">Done</button>
      <button id="panelfit-btn-cancel" style="
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

  document.getElementById('panelfit-btn-done')?.addEventListener('click', () => {
    finishPicking();
  });

  document.getElementById('panelfit-btn-cancel')?.addEventListener('click', () => {
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
      selectedElements = [];
      document.body.style.cursor = 'crosshair';
      createControlPanel();
      sendResponse({ status: 'started' });
    }
  });

  document.addEventListener('mouseover', (e) => {
    if (!isPickingMode) return;
    const target = e.target as HTMLElement;
    
    if (controlPanel && controlPanel.contains(target)) return;

    if (target.tagName === 'IMG' && !selectedElements.includes(target)) {
      target.style.outline = '4px dashed #646cff';
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
        target.style.outline = '4px solid #4CAF50';
        selectedElements.push(target);
      }
    } else {
      if (selectedElements.length === 0) {
        selectedElements.push(target);
        finishPicking();
      } else {
        if (!selectedElements.includes(target)) {
          target.style.outline = '4px solid #4CAF50';
          selectedElements.push(target);
        }
      }
    }
  }, { capture: true });
}

async function finishPicking() {
  isPickingMode = false;
  document.body.style.cursor = '';
  
  const finalSelector = generateGenericSelector(selectedElements);

  selectedElements.forEach(el => el.style.outline = '');
  selectedElements = [];
  removeControlPanel();

  const currentUrl = window.location.href;
  const presets = await storage.getItem<Preset[]>('local:panelfit_presets') || [];
  let matched = presets.find(p => doesUrlMatch(currentUrl, p.urlPattern));
  
  if (matched) {
    matched.selector = finalSelector;
  } else {
    matched = {
      id: Date.now().toString(),
      name: window.location.hostname,
      urlPattern: generateSmartPattern(currentUrl),
      selector: finalSelector,
      width: 100,
      enabled: true
    };
    presets.push(matched);
  }
  
  await storage.setItem('local:panelfit_presets', presets);
  console.log('[PanelFit] Abstract selector generated:', finalSelector);
}

function cancelPicking() {
  isPickingMode = false;
  document.body.style.cursor = '';
  selectedElements.forEach(el => el.style.outline = '');
  selectedElements = [];
  removeControlPanel();
}