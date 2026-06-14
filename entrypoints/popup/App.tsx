import { useState, useEffect } from 'react';
import { browser, storage } from '#imports';
import { doesUrlMatch, generateSmartPattern } from '@/utils/helpers';
import type { Preset } from '@/utils/types';
import { PresetCard } from './components/PresetCard';
import { PresetEditor } from './components/PresetEditor';
import { Search, Target, Plus } from 'lucide-react';
import './App.css';

type View = 'list' | 'edit';

function App() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [view, setView] = useState<View>('list');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [tempPreset, setTempPreset] = useState<Preset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      if (tabs[0]?.url) {
        setCurrentUrl(tabs[0].url);
        const tabId = tabs[0].id || null;
        setCurrentTabId(tabId);
        
        if (tabId) {
          browser.tabs.sendMessage(tabId, { action: 'STOP_PICKING' }).catch(() => {});
        }
      }
    });

    storage.getItem<Preset[]>('local:panelfit_presets').then((storedPresets) => {
      setPresets(storedPresets || []);
    });
  }, []);

  useEffect(() => {
    const handleUnload = () => {
      if (view === 'edit' && currentTabId) {
        browser.tabs.sendMessage(currentTabId, { action: 'CLEAR_PREVIEW' });
      }
    };

    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [view, currentTabId]);

  const savePresetsToStorage = async (newPresets: Preset[]) => {
    setPresets(newPresets);
    await storage.setItem('local:panelfit_presets', newPresets);
  };

  const startPicking = async () => {
    if (currentTabId) {
      // Pass the editingPresetId if the user is currently editing an active profile
      await browser.tabs.sendMessage(currentTabId, { 
        action: 'START_PICKING',
        presetId: editingPresetId 
      });
      window.close();
    }
  };

  const handleEditClick = (preset: Preset) => {
    setEditingPresetId(preset.id);
    setTempPreset({ ...preset });
    setView('edit');
  };

  const handleCreateManual = () => {
    let defaultName = 'New Preset';
    let defaultPattern = '*';
    
    if (currentUrl) {
      try {
        const urlObj = new URL(currentUrl);
        defaultName = urlObj.hostname;
        defaultPattern = generateSmartPattern(currentUrl);
      } catch (e) {
        // Safe fallback
      }
    }

    let uniqueName = defaultName;
    let counter = 1;
    while (presets.some(p => p.name === uniqueName)) {
      counter++;
      uniqueName = `${defaultName} (${counter})`;
    }

    const newPreset: Preset = {
      id: Date.now().toString(),
      name: uniqueName,
      urlPattern: defaultPattern,
      selector: 'img',
      width: 100,
      enabled: true,
    };

    setEditingPresetId(newPreset.id);
    setTempPreset(newPreset);
    setView('edit');
  };

  const handleTogglePresetInList = async (id: string) => {
    const updated = presets.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    await savePresetsToStorage(updated);
  };

  const handleUpdateTempPreset = (updates: Partial<Preset>) => {
    if (tempPreset) {
      const nextPreset = { ...tempPreset, ...updates };
      setTempPreset(nextPreset);

      if (currentTabId) {
        browser.tabs.sendMessage(currentTabId, { action: 'APPLY_PREVIEW', preset: nextPreset }).catch(() => {});
      }
    }
  };

  const handleBackToList = () => {
    if (currentTabId) {
      browser.tabs.sendMessage(currentTabId, { action: 'CLEAR_PREVIEW' }).catch(() => {});
    }
    setView('list');
    setEditingPresetId(null);
    setTempPreset(null);
  };

  const handleSavePreset = async () => {
    if (!tempPreset) return;

    if (currentTabId) {
      await browser.tabs.sendMessage(currentTabId, { action: 'CLEAR_PREVIEW' }).catch(() => {});
    }

    let updatedPresets: Preset[];
    const exists = presets.some((p) => p.id === tempPreset.id);

    if (exists) {
      updatedPresets = presets.map((p) => (p.id === tempPreset.id ? tempPreset : p));
    } else {
      updatedPresets = [...presets, tempPreset];
    }

    await savePresetsToStorage(updatedPresets);
    setView('list');
    setEditingPresetId(null);
    setTempPreset(null);
  };

  const handleDeletePreset = async (id: string) => {
    if (currentTabId) {
      await browser.tabs.sendMessage(currentTabId, { action: 'CLEAR_PREVIEW' }).catch(() => {});
    }
    const updated = presets.filter((p) => p.id !== id);
    await savePresetsToStorage(updated);
    setView('list');
    setEditingPresetId(null);
    setTempPreset(null);
  };

  const isPickable = currentUrl && (currentUrl.startsWith('http://') || currentUrl.startsWith('https://'));

  const filteredPresets = presets.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.urlPattern.toLowerCase().includes(query) ||
      p.selector.toLowerCase().includes(query)
    );
  });

  return (
    <div className="container">
      {view === 'list' ? (
        <div className="list-view">
          <div className="header-row">
            <h2>PanelFit</h2>
            <span className="badge-count">{presets.length} profiles</span>
          </div>

          <div className="search-box">
            <span className="search-icon"><Search size={14} /></span>
            <input
              type="text"
              placeholder="Search presets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="presets-list">
            {filteredPresets.length === 0 ? (
              <div className="empty-state">
                <p className="desc">
                  {presets.length === 0
                    ? "No layout rules defined. Configure patterns to adjust custom image dimensions."
                    : "No matching rules found."}
                </p>
              </div>
            ) : (
              filteredPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  currentUrl={currentUrl}
                  onEditClick={handleEditClick}
                  onTogglePreset={handleTogglePresetInList}
                  doesUrlMatch={doesUrlMatch}
                />
              ))
            )}
          </div>

          <div className="add-actions">
            <button
              onClick={startPicking}
              className="btn-primary flex-btn"
              disabled={!isPickable}
              title={!isPickable ? "Cannot pick elements on system or empty pages" : "Open element selector"}
              style={!isPickable ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            >
              <Target size={14} /> Pick on Page
            </button>
            <button onClick={handleCreateManual} className="btn-secondary flex-btn">
              <Plus size={14} /> Add Manual
            </button>
          </div>
        </div>
      ) : (
        tempPreset && (
          <PresetEditor
            tempPreset={tempPreset}
            isPickable={!!isPickable}
            onBack={handleBackToList}
            onUpdate={handleUpdateTempPreset}
            onStartPicking={startPicking}
            onSave={handleSavePreset}
            onDelete={handleDeletePreset}
          />
        )
      )}
    </div>
  );
}

export default App;