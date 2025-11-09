/**
 * PresetPanel Component Tests
 * 
 * Simplified tests focusing on core functionality:
 * - Component rendering
 * - Factory preset display
 * - User preset management (save/delete/display)
 * - Dialog interactions
 * - Callback invocation
 * 
 * Note: Export/Import functionality involves complex DOM manipulation
 * (createElement, FileReader, Blob) that are better tested in E2E tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PresetPanel } from '../../../src/ui/PresetPanel';
import { SynthProvider } from '../../../src/context/SynthContext';
import type { SynthEngine } from '../../../src/core/SynthEngine';
import type { PresetManager } from '../../../src/core/PresetManager';
import type { PresetData } from '../../../src/core/PresetManager';

// Mock factory presets module
vi.mock('../../../src/core/FactoryPresets', () => ({
  FACTORY_PRESETS: [
    {
      name: 'Init',
      author: 'Factory',
      description: 'Clean starting point',
      oscillators: {
        1: { enabled: true, waveform: 'sine', octave: 0, detune: 0, volume: 0.8, pan: 0, fmEnabled: false, fmDepth: 0 },
        2: { enabled: false, waveform: 'sine', octave: 0, detune: 0, volume: 0.5, pan: 0, fmEnabled: false, fmDepth: 0 },
        3: { enabled: false, waveform: 'sine', octave: 0, detune: 0, volume: 0.5, pan: 0, fmEnabled: false, fmDepth: 0 },
      },
      envelopes: {
        1: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
        2: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
        3: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
      },
    },
    {
      name: 'Brass',
      author: 'Factory',
      description: 'Warm brass sound',
      oscillators: {
        1: { enabled: true, waveform: 'sawtooth', octave: 0, detune: 0, volume: 0.8, pan: 0, fmEnabled: false, fmDepth: 0 },
        2: { enabled: true, waveform: 'square', octave: -1, detune: -7, volume: 0.6, pan: 0, fmEnabled: false, fmDepth: 0 },
        3: { enabled: false, waveform: 'sine', octave: 0, detune: 0, volume: 0.5, pan: 0, fmEnabled: false, fmDepth: 0 },
      },
      envelopes: {
        1: { attack: 0.02, decay: 0.15, sustain: 0.6, release: 0.5 },
        2: { attack: 0.02, decay: 0.15, sustain: 0.6, release: 0.5 },
        3: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
      },
    },
  ],
}));

describe('PresetPanel', () => {
  let mockPresetManager: PresetManager;
  let mockEngine: SynthEngine;

  function createMockPresetManager(): PresetManager {
    const userPresetsStorage: Map<string, PresetData> = new Map();

    return {
      getCurrentPreset: vi.fn(() => ({
        name: 'Current',
        author: 'User',
        description: 'Current state',
        oscillators: {
          1: { enabled: true, waveform: 'sine', octave: 0, detune: 0, volume: 0.8, pan: 0, fmEnabled: false, fmDepth: 0 },
          2: { enabled: false, waveform: 'sine', octave: 0, detune: 0, volume: 0.5, pan: 0, fmEnabled: false, fmDepth: 0 },
          3: { enabled: false, waveform: 'sine', octave: 0, detune: 0, volume: 0.5, pan: 0, fmEnabled: false, fmDepth: 0 },
        },
        envelopes: {
          1: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
          2: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
          3: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
        },
      })),
      loadPreset: vi.fn(),
      savePreset: vi.fn((name: string) => {
        const preset: PresetData = {
          name,
          author: 'User',
          description: '',
          oscillators: {
            1: { enabled: true, waveform: 'sine', octave: 0, detune: 0, volume: 0.8, pan: 0, fmEnabled: false, fmDepth: 0 },
            2: { enabled: false, waveform: 'sine', octave: 0, detune: 0, volume: 0.5, pan: 0, fmEnabled: false, fmDepth: 0 },
            3: { enabled: false, waveform: 'sine', octave: 0, detune: 0, volume: 0.5, pan: 0, fmEnabled: false, fmDepth: 0 },
          },
          envelopes: {
            1: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
            2: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
            3: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
          },
        };
        userPresetsStorage.set(name, preset);
      }),
      getUserPreset: vi.fn((name: string) => userPresetsStorage.get(name) || null),
      getUserPresetNames: vi.fn(() => Array.from(userPresetsStorage.keys()).sort()),
      deletePreset: vi.fn((name: string) => {
        return userPresetsStorage.delete(name);
      }),
      exportPreset: vi.fn((preset: PresetData) => JSON.stringify(preset, null, 2)),
      importPreset: vi.fn((json: string) => JSON.parse(json) as PresetData),
    } as any;
  }

  function createMockSynthEngine(presetManager?: PresetManager): SynthEngine {
    const pm = presetManager || mockPresetManager;
    return {
      isInitialized: () => true,
      getPresetManager: () => pm,
    } as any;
  }

  function renderWithContext(component: React.ReactElement, engine?: SynthEngine) {
    const testEngine = engine || mockEngine;
    return render(
      <SynthProvider engine={testEngine}>
        {component}
      </SynthProvider>
    );
  }

  beforeEach(() => {
    mockPresetManager = createMockPresetManager();
    mockEngine = createMockSynthEngine(mockPresetManager);
    vi.clearAllMocks();
    
    // Mock window.alert to avoid jsdom errors
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  describe('Rendering', () => {
    it('should render preset panel with title', () => {
      renderWithContext(<PresetPanel />);
      
      expect(screen.getByText('Presets')).toBeInTheDocument();
    });

    it('should render preset selector dropdown', () => {
      renderWithContext(<PresetPanel />);
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Load Preset')).toBeInTheDocument();
    });

    it('should render default option', () => {
      renderWithContext(<PresetPanel />);
      
      expect(screen.getByText('-- Select Preset --')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      renderWithContext(<PresetPanel />);
      
      expect(screen.getByText('Save Preset')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByText('Import')).toBeInTheDocument();
    });
  });

  describe('Factory Presets', () => {
    it('should render factory presets optgroup', () => {
      const { container } = renderWithContext(<PresetPanel />);
      
      const optgroup = container.querySelector('optgroup[label="Factory Presets"]');
      expect(optgroup).toBeInTheDocument();
    });

    it('should list all factory presets', () => {
      renderWithContext(<PresetPanel />);
      
      expect(screen.getByRole('option', { name: 'Init' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Brass' })).toBeInTheDocument();
    });

    it('should update selected preset state when factory preset selected', () => {
      renderWithContext(<PresetPanel />);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'Init' } });
      
      expect(select.value).toBe('Init');
    });

    it('should call onPresetLoad callback when factory preset loaded', () => {
      const onLoad = vi.fn();
      renderWithContext(<PresetPanel onPresetLoad={onLoad} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Brass' } });
      
      expect(onLoad).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Presets', () => {
    it('should not render user presets optgroup when no user presets exist', () => {
      renderWithContext(<PresetPanel />);
      
      const optgroups = screen.getAllByRole('group');
      expect(optgroups).toHaveLength(1); // Only Factory Presets
    });

    it('should render user presets optgroup after saving a preset', () => {
      renderWithContext(<PresetPanel />);
      
      // Save a preset through the UI
      fireEvent.click(screen.getByText('Save Preset'));
      const input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: 'My Sound' } });
      const saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      
      // Now check for user presets optgroup
      const optgroups = screen.getAllByRole('group');
      expect(optgroups.length).toBeGreaterThan(1);
    });

    it('should list user presets in dropdown after saving', () => {
      renderWithContext(<PresetPanel />);
      
      // Save first preset
      fireEvent.click(screen.getByText('Save Preset'));
      let input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: 'My Sound' } });
      let saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      
      // Save second preset
      fireEvent.click(screen.getByText('Save Preset'));
      input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: 'Bass Patch' } });
      saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      
      // Check both are listed in dropdown (use role to be specific)
      expect(screen.getByRole('option', { name: 'Bass Patch' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'My Sound' })).toBeInTheDocument();
    });

    it('should display user presets list section after saving', () => {
      renderWithContext(<PresetPanel />);
      
      // Initially no user presets section
      expect(screen.queryByText('Your Presets')).not.toBeInTheDocument();
      
      // Save a preset
      fireEvent.click(screen.getByText('Save Preset'));
      const input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: 'Test Preset' } });
      const saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      
      // Now it should appear
      expect(screen.getByText('Your Presets')).toBeInTheDocument();
    });

    it('should render delete button for each user preset', () => {
      renderWithContext(<PresetPanel />);
      
      // Save two presets
      fireEvent.click(screen.getByText('Save Preset'));
      let input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: 'Preset 1' } });
      let saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      
      fireEvent.click(screen.getByText('Save Preset'));
      input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: 'Preset 2' } });
      saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      
      const deleteButtons = screen.getAllByText('×');
      expect(deleteButtons).toHaveLength(2);
    });
  });

  describe('Save Preset Dialog', () => {
    it('should not show save dialog initially', () => {
      renderWithContext(<PresetPanel />);
      
      // Check that dialog input is NOT visible (dialog is hidden)
      expect(screen.queryByPlaceholderText('Preset name...')).not.toBeInTheDocument();
    });

    it('should open save dialog when Save Preset clicked', () => {
      renderWithContext(<PresetPanel />);
      
      const saveButton = screen.getByRole('button', { name: /Save Preset/i });
      fireEvent.click(saveButton);
      
      // Check that dialog input IS now visible
      expect(screen.getByPlaceholderText('Preset name...')).toBeInTheDocument();
    });

    it('should render input field in save dialog', () => {
      renderWithContext(<PresetPanel />);
      
      fireEvent.click(screen.getByText('Save Preset'));
      
      const input = screen.getByPlaceholderText('Preset name...');
      expect(input).toBeInTheDocument();
    });

    it('should render Save and Cancel buttons in dialog', () => {
      renderWithContext(<PresetPanel />);
      
      fireEvent.click(screen.getByText('Save Preset'));
      
      // Dialog has Save and Cancel buttons
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should close dialog when Cancel clicked', () => {
      renderWithContext(<PresetPanel />);
      
      fireEvent.click(screen.getByRole('button', { name: /Save Preset/i }));
      expect(screen.getByPlaceholderText('Preset name...')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByPlaceholderText('Preset name...')).not.toBeInTheDocument();
    });

    it('should call savePreset with entered name', () => {
      renderWithContext(<PresetPanel />);
      
      fireEvent.click(screen.getByText('Save Preset'));
      const input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: 'New Sound' } });
      
      const saveButtons = screen.getAllByText('Save');
      const dialogSaveButton = saveButtons[saveButtons.length - 1];
      fireEvent.click(dialogSaveButton);
      
      expect(mockPresetManager.savePreset).toHaveBeenCalledWith('New Sound', 'User');
    });

    it('should trim whitespace from preset name', () => {
      renderWithContext(<PresetPanel />);
      
      fireEvent.click(screen.getByText('Save Preset'));
      const input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: '  Spaced  ' } });
      
      const saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      
      expect(mockPresetManager.savePreset).toHaveBeenCalledWith('Spaced', 'User');
    });

    it('should not save preset with empty name', () => {
      renderWithContext(<PresetPanel />);
      
      fireEvent.click(screen.getByText('Save Preset'));
      const input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: '   ' } }); // Only whitespace
      
      const saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      
      expect(mockPresetManager.savePreset).not.toHaveBeenCalled();
    });

    it('should close dialog after successful save', () => {
      renderWithContext(<PresetPanel />);
      
      fireEvent.click(screen.getByRole('button', { name: /Save Preset/i }));
      const input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: 'Test' } });
      
      const saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      
      expect(screen.queryByPlaceholderText('Preset name...')).not.toBeInTheDocument();
    });
  });

  describe('Delete Preset', () => {
    it('should show confirmation dialog when delete clicked', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      renderWithContext(<PresetPanel />);
      
      // Save a preset
      fireEvent.click(screen.getByText('Save Preset'));
      const input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: 'To Delete' } });
      const saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      
      // Click delete button
      const deleteButton = screen.getByText('×');
      fireEvent.click(deleteButton);
      
      expect(confirmSpy).toHaveBeenCalledWith('Delete preset "To Delete"?');
      
      confirmSpy.mockRestore();
    });

    it('should delete preset when confirmed', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      renderWithContext(<PresetPanel />);
      
      // Save a preset
      fireEvent.click(screen.getByText('Save Preset'));
      const input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: 'To Delete' } });
      const saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      
      // Delete it
      const deleteButton = screen.getByText('×');
      fireEvent.click(deleteButton);
      
      expect(mockPresetManager.deletePreset).toHaveBeenCalledWith('To Delete');
      
      confirmSpy.mockRestore();
    });

    it('should not delete preset when cancelled', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      renderWithContext(<PresetPanel />);
      
      // Save a preset
      fireEvent.click(screen.getByText('Save Preset'));
      const input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: 'Keep Me' } });
      const saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      
      // Try to delete but cancel
      const deleteButton = screen.getByText('×');
      fireEvent.click(deleteButton);
      
      expect(mockPresetManager.deletePreset).not.toHaveBeenCalled();
      
      confirmSpy.mockRestore();
    });

    it('should clear selected preset if deleting currently selected', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      renderWithContext(<PresetPanel />);
      
      // Save and select a preset
      fireEvent.click(screen.getByText('Save Preset'));
      const input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: 'Selected' } });
      const saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'Selected' } });
      expect(select.value).toBe('Selected');
      
      // Delete the selected preset
      const deleteButton = screen.getByText('×');
      fireEvent.click(deleteButton);
      
      // Selection should be cleared
      expect(select.value).toBe('');
      
      confirmSpy.mockRestore();
    });
  });

  describe('Component Integration', () => {
    it('should work without onPresetLoad callback', () => {
      renderWithContext(<PresetPanel />);
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Init' } });
      
      // Should not crash
      expect(select).toBeInTheDocument();
    });

    it('should update user presets list after save', () => {
      renderWithContext(<PresetPanel />);
      
      // Initially no user presets section
      expect(screen.queryByText('Your Presets')).not.toBeInTheDocument();
      
      // Save a preset
      fireEvent.click(screen.getByText('Save Preset'));
      const input = screen.getByPlaceholderText('Preset name...');
      fireEvent.change(input, { target: { value: 'New Preset' } });
      const saveButtons = screen.getAllByText('Save');
      fireEvent.click(saveButtons[saveButtons.length - 1]);
      
      // Check it appears in the list
      expect(screen.getByText('Your Presets')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'New Preset' })).toBeInTheDocument();
    });

    it('should handle empty preset selection', () => {
      renderWithContext(<PresetPanel />);
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '' } });
      
      // Should not call loadPreset
      expect(mockPresetManager.loadPreset).not.toHaveBeenCalled();
    });
  });
});

