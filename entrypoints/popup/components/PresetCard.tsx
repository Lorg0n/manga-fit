import React from 'react';
import { Edit2 } from 'lucide-react';
import type { Preset } from '@/utils/types';

interface PresetCardProps {
  preset: Preset;
  currentUrl: string;
  onEditClick: (preset: Preset) => void;
  onTogglePreset: (id: string) => void;
  doesUrlMatch: (url: string, pattern: string) => boolean;
}

export const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  currentUrl,
  onEditClick,
  onTogglePreset,
  doesUrlMatch,
}) => {
  const matchesCurrent = currentUrl && doesUrlMatch(currentUrl, preset.urlPattern);

  return (
    <div className={`preset-card ${matchesCurrent ? 'matches-current' : ''}`}>
      <div className="preset-info" onClick={() => onEditClick(preset)}>
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
            onChange={() => onTogglePreset(preset.id)}
          />
          <span className="slider"></span>
        </label>
        <button 
          onClick={() => onEditClick(preset)} 
          className="btn-text-icon" 
          title="Edit preset"
        >
          <Edit2 size={14} />
        </button>
      </div>
    </div>
  );
};