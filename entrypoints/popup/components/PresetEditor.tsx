import React from 'react';
import { ArrowLeft, Trash2, Check, Target } from 'lucide-react';
import type { Preset } from '@/utils/types';

interface PresetEditorProps {
  tempPreset: Preset;
  isPickable: boolean;
  onBack: () => void;
  onUpdate: (updates: Partial<Preset>) => void;
  onStartPicking: () => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}

export const PresetEditor: React.FC<PresetEditorProps> = ({
  tempPreset,
  isPickable,
  onBack,
  onUpdate,
  onStartPicking,
  onSave,
  onDelete,
}) => {
  return (
    <div className="editor-view">
      <div className="editor-header">
        <button onClick={onBack} className="btn-back">
          <ArrowLeft size={14} /> Back
        </button>
        <span className="editor-title">Edit Preset</span>
      </div>

      <div className="editor-content">
        <div className="form-group">
          <label>Preset Name</label>
          <input
            type="text"
            value={tempPreset.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>URL Pattern (Uses * wildcards)</label>
          <input
            type="text"
            value={tempPreset.urlPattern}
            onChange={(e) => onUpdate({ urlPattern: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>CSS Selector</label>
          <div className="input-row">
            <input
              type="text"
              value={tempPreset.selector}
              onChange={(e) => onUpdate({ selector: e.target.value })}
            />
            <button
              onClick={onStartPicking}
              disabled={!isPickable}
              className="btn-icon"
              title={!isPickable ? "Cannot pick on this page" : "Start element selector"}
              style={!isPickable ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            >
              <Target size={14} />
            </button>
          </div>
        </div>

        <div className="form-group slider-group">
          <div className="slider-header">
            <label>Width Scaling</label>
            <span className="slider-value">{tempPreset.width}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="200"
            value={tempPreset.width}
            onChange={(e) => onUpdate({ width: parseInt(e.target.value, 10) })}
          />
        </div>

        <div className="form-group switch-form-group">
          <label>Status</label>
          <div className="switch-with-label">
            <label className="switch">
              <input
                type="checkbox"
                checked={tempPreset.enabled}
                onChange={(e) => onUpdate({ enabled: e.target.checked })}
              />
              <span className="slider"></span>
            </label>
            <span className="switch-status-text">
              {tempPreset.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      <div className="actions">
        <button onClick={() => onDelete(tempPreset.id)} className="btn-danger flex-btn">
          <Trash2 size={14} /> Delete
        </button>
        <button onClick={onSave} className="btn-save flex-btn">
          <Check size={14} /> Save
        </button>
      </div>
    </div>
  );
};