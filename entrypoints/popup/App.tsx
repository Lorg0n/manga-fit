import { useState, useEffect } from 'react';
import { browser, storage } from '#imports';
import { doesUrlMatch, generateSmartPattern } from '@/utils/helpers';
import type { Preset } from '@/utils/types';
import './App.css';

type View = 'list' | 'edit';

function App() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [view, setView] = useState<View>('list');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      if (tabs[0]?.url) {
        setCurrentUrl(tabs[0].url);
        setCurrentTabId(tabs[0].id || null);
      }
    });

    storage.getItem<Preset[]>('local:panelfit_presets').then((storedPresets) => {
      setPresets(storedPresets || []);
    });
  }, []);

  const savePresets = async (newPresets: Preset[]) => {
    setPresets(newPresets);
    await storage.setItem('local:panelfit_presets', newPresets);
  };

  const startPicking = async () => {
    if (currentTabId) {
      await browser.tabs.sendMessage(currentTabId, { action: 'START_PICKING' });
      window.close();
    }
  };

  const handleCreateManual = async () => {
    let defaultName = 'New Preset';
    let defaultPattern = '*';
    
    if (currentUrl) {
      try {
        const urlObj = new URL(currentUrl);
        defaultName = urlObj.hostname;
        defaultPattern = generateSmartPattern(currentUrl);
      } catch (e) {
        // Fallback for unexpected URL formats
      }
    }

    const newPreset: Preset = {
      id: Date.now().toString(),
      name: defaultName,
      urlPattern: defaultPattern,
      selector: 'img',
      width: 100,
      enabled: true,
    };

    const updatedPresets = [...presets, newPreset];
    await savePresets(updatedPresets);
    setEditingPresetId(newPreset.id);
    setView('edit');
  };

  const handleTogglePreset = async (id: string) => {
    const updated = presets.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    await savePresets(updated);
  };

  const handleUpdatePreset = async (id: string, updates: Partial<Preset>) => {
    const updated = presets.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    await savePresets(updated);
  };

  const handleDeletePreset = async (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    await savePresets(updated);
    setView('list');
    setEditingPresetId(null);
  };

  const activePreset = presets.find((p) => editingPresetId === p.id);
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
            <h2>PanelFit Manager</h2>
            <span className="badge-count">{presets.length} profiles</span>
          </div>

          {presets.length > 0 && (
            <div className="search-box">
              <input
                type="text"
                placeholder="Search presets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          <div className="presets-list">
            {filteredPresets.length === 0 ? (
              <div className="empty-state">
                <p className="desc">
                  {presets.length === 0
                    ? "No patterns defined yet. Start matching website images to dynamically adjust their dimensions."
                    : "No matching presets found."}
                </p>
              </div>
            ) : (
              filteredPresets.map((preset) => {
                const matchesCurrent = currentUrl && doesUrlMatch(currentUrl, preset.urlPattern);
                return (
                  <div
                    key={preset.id}
                    className={`preset-card ${matchesCurrent ? 'matches-current' : ''}`}
                  >
                    <div className="preset-info" onClick={() => {
                      setEditingPresetId(preset.id);
                      setView('edit');
                    }}>
                      <div className="preset-header">
                        <span className="preset-name">{preset.name}</span>
                        {matchesCurrent && <span className="active-badge">Active</span>}
                      </div>
                      <span className="preset-pattern">{preset.urlPattern}</span>
                    </div>
                    <div className="preset-actions-cell">
                      <label className="switch" title="Toggle active status">
                        <input
                          type="checkbox"
                          checked={preset.enabled}
                          onChange={() => handleTogglePreset(preset.id)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="add-actions">
            <button
              onClick={startPicking}
              className="btn-primary flex-btn"
              disabled={!isPickable}
              title={!isPickable ? "Cannot pick elements on extension or system pages" : "Start element picker"}
              style={!isPickable ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              🎯 Pick on Current Page
            </button>
            <button onClick={handleCreateManual} className="btn-secondary flex-btn">
              ➕ Add Manual Rule
            </button>
          </div>
        </div>
      ) : (
        activePreset && (
          <div className="editor-view">
            <div className="editor-header">
              <button onClick={() => setView('list')} className="btn-back">
                &larr; Back to list
              </button>
              <span className="editor-title">Edit Preset</span>
            </div>

            <div className="form-group">
              <label>Preset Name</label>
              <input
                type="text"
                value={activePreset.name}
                onChange={(e) => handleUpdatePreset(activePreset.id, { name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>URL Pattern (Uses * for wildcards)</label>
              <input
                type="text"
                value={activePreset.urlPattern}
                onChange={(e) => handleUpdatePreset(activePreset.id, { urlPattern: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>CSS Selector (Target Elements)</label>
              <div className="input-row">
                <input
                  type="text"
                  value={activePreset.selector}
                  onChange={(e) => handleUpdatePreset(activePreset.id, { selector: e.target.value })}
                />
                <button
                  onClick={startPicking}
                  disabled={!isPickable}
                  className="btn-icon"
                  title={!isPickable ? "Cannot pick on this tab" : "Repick on page"}
                  style={!isPickable ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  🎯
                </button>
              </div>
            </div>

            <div className="form-group slider-group">
              <label>Width: <strong>{activePreset.width}%</strong></label>
              <input
                type="range"
                min="10"
                max="200"
                value={activePreset.width}
                onChange={(e) => handleUpdatePreset(activePreset.id, { width: parseInt(e.target.value, 10) })}
              />
            </div>

            <div className="form-group switch-form-group">
              <label>Status</label>
              <div className="switch-with-label">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={activePreset.enabled}
                    onChange={() => handleTogglePreset(activePreset.id)}
                  />
                  <span className="slider"></span>
                </label>
                <span className="switch-status-text">
                  {activePreset.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="actions">
              <button onClick={() => handleDeletePreset(activePreset.id)} className="btn-danger">
                Delete Preset
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default App;