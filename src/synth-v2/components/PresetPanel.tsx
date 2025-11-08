/**
 * PresetPanel - UI for managing presets
 * Allows loading factory presets, saving/loading user presets, and import/export
 */

import { useState } from 'react';
import { useSynthEngine } from '../context/SynthContext';
import { FACTORY_PRESETS } from '../core/FactoryPresets';

interface PresetPanelProps {
  onPresetLoad?: () => void;
}

export function PresetPanel({ onPresetLoad }: PresetPanelProps) {
  const { engine } = useSynthEngine();
  
  // Safely get manager (will be null before initialization)
  let presetManager;
  try {
    presetManager = engine.getPresetManager();
  } catch {
    presetManager = null;
  }

  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [userPresets, setUserPresets] = useState<string[]>(presetManager?.getUserPresetNames() ?? []);

  const handleLoadPreset = (presetName: string) => {
    if (!presetName || !presetManager) return;

    // Check factory presets first
    const factoryPreset = FACTORY_PRESETS.find(p => p.name === presetName);
    if (factoryPreset) {
      presetManager.loadPreset(factoryPreset);
      setSelectedPreset(presetName);
      // Notify parent to trigger re-render
      if (onPresetLoad) onPresetLoad();
      return;
    }

    // Check user presets
    const userPreset = presetManager.getUserPreset(presetName);
    if (userPreset) {
      presetManager.loadPreset(userPreset);
      setSelectedPreset(presetName);
      // Notify parent to trigger re-render
      if (onPresetLoad) onPresetLoad();
    }
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim() || !presetManager) return;

    try {
      presetManager.savePreset(newPresetName.trim(), 'User');
      setUserPresets(presetManager.getUserPresetNames());
      setNewPresetName('');
      setSaveDialogOpen(false);
      alert(`Preset "${newPresetName}" saved successfully!`);
    } catch (error) {
      alert(`Error saving preset: ${error}`);
    }
  };

  const handleDeletePreset = (presetName: string) => {
    if (!confirm(`Delete preset "${presetName}"?`) || !presetManager) return;

    if (presetManager.deletePreset(presetName)) {
      setUserPresets(presetManager.getUserPresetNames());
      if (selectedPreset === presetName) {
        setSelectedPreset('');
      }
    }
  };

  const handleExport = () => {
    if (!presetManager) return;
    
    const currentPreset = presetManager.getCurrentPreset();
    const json = presetManager.exportPreset(currentPreset);
    
    // Create download link
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synth-preset-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!presetManager) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !presetManager) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          const preset = presetManager.importPreset(json);
          presetManager.loadPreset(preset);
          alert(`Imported preset: "${preset.name}"`);
          // Notify parent to trigger re-render
          if (onPresetLoad) onPresetLoad();
        } catch (error) {
          alert(`Error importing preset: ${error}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="preset-panel">
      <h3>Presets</h3>

      {/* Preset Selector */}
      <div className="preset-selector">
        <label>Load Preset</label>
        <select 
          value={selectedPreset} 
          onChange={(e) => handleLoadPreset(e.target.value)}
        >
          <option value="">-- Select Preset --</option>
          
          <optgroup label="Factory Presets">
            {FACTORY_PRESETS.map(preset => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </optgroup>

          {userPresets.length > 0 && (
            <optgroup label="User Presets">
              {userPresets.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="preset-actions">
        <button onClick={() => setSaveDialogOpen(true)} className="preset-btn success">
          Save Preset
        </button>
        <button onClick={handleExport} className="preset-btn primary">
          Export
        </button>
        <button onClick={handleImport} className="preset-btn primary">
          Import
        </button>
      </div>

      {/* User Presets List */}
      {userPresets.length > 0 && (
        <div className="user-presets-list">
          <h4>Your Presets</h4>
          <ul>
            {userPresets.map(name => (
              <li key={name}>
                <span>{name}</span>
                <button 
                  onClick={() => handleDeletePreset(name)} 
                  className="delete-btn"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Save Dialog */}
      {saveDialogOpen && (
        <div className="save-dialog">
          <div className="dialog-content">
            <h4>Save Preset</h4>
            <input
              type="text"
              placeholder="Preset name..."
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
              autoFocus
            />
            <div className="dialog-actions">
              <button onClick={handleSavePreset} className="preset-btn success">
                Save
              </button>
              <button onClick={() => setSaveDialogOpen(false)} className="preset-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
