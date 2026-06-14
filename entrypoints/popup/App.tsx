import { useState, useEffect } from 'react';
import { browser, storage } from '#imports';
import { doesUrlMatch } from '@/utils/helpers';
import type { Preset } from '@/utils/types';
import './App.css';

function App() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [activePreset, setActivePreset] = useState<Preset | null>(null);

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      if (tabs[0]?.url) {
        setCurrentUrl(tabs[0].url);
        const storedPresets = await storage.getItem<Preset[]>('local:panelfit_presets') || [];
        setPresets(storedPresets);
        
        const matched = storedPresets.find(p => doesUrlMatch(tabs[0].url!, p.urlPattern));
        setActivePreset(matched || null);
      }
    });
  }, []);

  const startPicking = async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      await browser.tabs.sendMessage(tabs[0].id, { action: 'START_PICKING' });
      window.close();
    }
  };

  const updateActivePreset = async (updates: Partial<Preset>) => {
    if (!activePreset) return;
    const updated = { ...activePreset, ...updates };
    setActivePreset(updated);

    const newPresets = presets.map(p => p.id === updated.id ? updated : p);
    setPresets(newPresets);
    await storage.setItem('local:panelfit_presets', newPresets);
  };

  const deletePreset = async () => {
    if (!activePreset) return;
    const newPresets = presets.filter(p => p.id !== activePreset.id);
    setPresets(newPresets);
    setActivePreset(null);
    await storage.setItem('local:panelfit_presets', newPresets);
  };

  return (
    <div className="container">
      <h2>PanelFit Manager</h2>
      
      {!activePreset ? (
        <div className="setup">
          <p className="desc">
            No rules set for this page. <br/><br/>
            <strong>Tip:</strong> Hold <kbd>Ctrl</kbd> while clicking to select multiple images so PanelFit can learn the pattern!
          </p>
          <button onClick={startPicking} className="btn-primary">
            Create Preset & Pick Image
          </button>
        </div>
      ) : (
        <div className="editor">
          <p className="desc">Edit settings for this site profile.</p>
          
          <div className="form-group">
            <label>URL Pattern (Uses * for wildcards)</label>
            <input 
              type="text" 
              value={activePreset.urlPattern} 
              onChange={e => updateActivePreset({ urlPattern: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>CSS Selector (Images to resize)</label>
            <div className="input-row">
              <input 
                type="text" 
                value={activePreset.selector} 
                onChange={e => updateActivePreset({ selector: e.target.value })}
              />
              <button onClick={startPicking} className="btn-icon" title="Repick on page">🎯</button>
            </div>
          </div>
          
          <div className="form-group slider-group">
            <label>Width: <strong>{activePreset.width}%</strong></label>
            <input 
              type="range" 
              min="10" 
              max="200" 
              value={activePreset.width} 
              onChange={e => updateActivePreset({ width: parseInt(e.target.value, 10) })} 
            />
          </div>

          <div className="actions">
            <button onClick={deletePreset} className="btn-danger">Delete Preset</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;