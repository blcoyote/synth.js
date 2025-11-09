/**
 * PresetMenu - Hamburger-style floating menu for preset management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSynthEngine } from '../context/SynthContext';
import { FACTORY_PRESETS } from '../core/FactoryPresets';

interface PresetMenuProps {
  onPresetLoad?: () => void;
}

export function PresetMenu({ onPresetLoad }: PresetMenuProps) {
  const { engine } = useSynthEngine();
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Safely get manager (will be null before initialization)
  let presetManager;
  try {
    presetManager = engine.getPresetManager();
  } catch {
    presetManager = null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [userPresets, setUserPresets] = useState<string[]>(presetManager?.getUserPresetNames() ?? []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  const handleLoadPreset = useCallback((presetName: string) => {
    if (!presetName || !presetManager) return;

    // Check factory presets first
    const factoryPreset = FACTORY_PRESETS.find(p => p.name === presetName);
    if (factoryPreset) {
      presetManager.loadPreset(factoryPreset);
      setSelectedPreset(presetName);
      setIsOpen(false);
      if (onPresetLoad) onPresetLoad();
      return;
    }

    // Check user presets
    const userPreset = presetManager.getUserPreset(presetName);
    if (userPreset) {
      presetManager.loadPreset(userPreset);
      setSelectedPreset(presetName);
      setIsOpen(false);
      if (onPresetLoad) onPresetLoad();
    }
  }, [presetManager, onPresetLoad]);

  const handleSavePreset = useCallback(() => {
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
  }, [presetManager, newPresetName]);

  const handleDeletePreset = useCallback((presetName: string) => {
    if (!confirm(`Delete preset "${presetName}"?`) || !presetManager) return;

    if (presetManager.deletePreset(presetName)) {
      setUserPresets(presetManager.getUserPresetNames());
      if (selectedPreset === presetName) {
        setSelectedPreset('');
      }
    }
  }, [presetManager, selectedPreset]);

  const handleExport = useCallback(() => {
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
    setIsOpen(false);
  }, [presetManager]);

  const handleImport = useCallback(() => {
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
          setIsOpen(false);
          if (onPresetLoad) onPresetLoad();
        } catch (error) {
          alert(`Error importing preset: ${error}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [presetManager, onPresetLoad]);

  return (
    <div className="preset-menu-container" ref={menuRef}>
      {/* Hamburger Button */}
      <button 
        className={`hamburger-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Presets Menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div className="preset-floating-menu">
          <div className="preset-menu-header">
            <h3>Presets</h3>
          </div>

          {/* Factory Presets */}
          <div className="preset-menu-section">
            <h4>Factory Presets</h4>
            <div className="preset-list">
              {FACTORY_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  className={`preset-item ${selectedPreset === preset.name ? 'active' : ''}`}
                  onClick={() => handleLoadPreset(preset.name)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* User Presets */}
          {userPresets.length > 0 && (
            <div className="preset-menu-section">
              <h4>User Presets</h4>
              <div className="preset-list">
                {userPresets.map(name => (
                  <div key={name} className="preset-item-with-delete">
                    <button
                      className={`preset-item ${selectedPreset === name ? 'active' : ''}`}
                      onClick={() => handleLoadPreset(name)}
                    >
                      {name}
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeletePreset(name)}
                      title="Delete preset"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="preset-menu-actions">
            <button onClick={() => setSaveDialogOpen(true)} className="menu-action-btn">
              💾 Save Current
            </button>
            <button onClick={handleImport} className="menu-action-btn">
              📥 Import
            </button>
            <button onClick={handleExport} className="menu-action-btn">
              📤 Export
            </button>
          </div>

          {/* Save Dialog */}
          {saveDialogOpen && (
            <div className="save-dialog-inline">
              <input
                type="text"
                placeholder="Preset name..."
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                autoFocus
              />
              <div className="dialog-actions">
                <button onClick={handleSavePreset} className="save-btn">
                  Save
                </button>
                <button onClick={() => setSaveDialogOpen(false)} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
