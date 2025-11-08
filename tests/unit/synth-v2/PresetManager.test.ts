/**
 * PresetManager Tests
 * 
 * Tests preset save/load/export/import operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PresetManager } from '../../../src/synth-v2/core/PresetManager';
import type { VoiceStateManager } from '../../../src/state';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock VoiceStateManager
function createMockVoiceState(): VoiceStateManager {
  return {
    oscillatorConfigs: new Map([
      [1, {
        enabled: true,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.8,
        pan: 0,
      }],
      [2, {
        enabled: false,
        waveform: 'sawtooth',
        octave: -1,
        detune: -7,
        volume: 0.6,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      }],
      [3, {
        enabled: false,
        waveform: 'square',
        octave: 1,
        detune: 7,
        volume: 0.5,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      }],
    ]),
    envelopeSettings: {
      1: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
      2: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
      3: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    },
    activeVoices: new Map(),
  } as any;
}

describe('PresetManager', () => {
  let presetManager: PresetManager;
  let voiceState: VoiceStateManager;

  beforeEach(() => {
    voiceState = createMockVoiceState();
    presetManager = new PresetManager(voiceState);
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Constructor', () => {
    it('should create a preset manager instance', () => {
      expect(presetManager).toBeDefined();
    });

    it('should load presets from localStorage if available', () => {
      const testPreset = {
        name: 'Test Preset',
        author: 'Tester',
        description: 'A test preset',
        oscillators: {
          1: { enabled: true, waveform: 'sine', octave: 0, detune: 0, volume: 0.8, pan: 0 },
          2: { enabled: false, waveform: 'sawtooth', octave: -1, detune: -7, volume: 0.6, pan: 0 },
          3: { enabled: false, waveform: 'square', octave: 1, detune: 7, volume: 0.5, pan: 0 },
        },
        envelopes: {
          1: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
          2: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
          3: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
        },
      };

      localStorageMock.setItem('synth-v2-presets', JSON.stringify([testPreset]));
      
      const manager = new PresetManager(voiceState);
      const names = manager.getUserPresetNames();
      
      expect(names).toContain('Test Preset');
    });
  });

  describe('getCurrentPreset', () => {
    it('should capture current synth configuration', () => {
      const preset = presetManager.getCurrentPreset();

      expect(preset.oscillators[1]).toEqual({
        enabled: true,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.8,
        pan: 0,
      });

      expect(preset.envelopes[1]).toEqual({
        attack: 0.01,
        decay: 0.1,
        sustain: 0.7,
        release: 0.3,
      });
    });

    it('should deep copy configuration', () => {
      const preset = presetManager.getCurrentPreset();
      
      // Modify preset
      preset.oscillators[1].volume = 0.5;
      
      // Original config should be unchanged
      expect(voiceState.oscillatorConfigs.get(1)!.volume).toBe(0.8);
    });
  });

  describe('savePreset', () => {
    it('should save preset with metadata', () => {
      presetManager.savePreset('My Preset', 'Test Author', 'A cool sound');

      const names = presetManager.getUserPresetNames();
      expect(names).toContain('My Preset');

      const preset = presetManager.getUserPreset('My Preset');
      expect(preset?.name).toBe('My Preset');
      expect(preset?.author).toBe('Test Author');
      expect(preset?.description).toBe('A cool sound');
    });

    it('should persist to localStorage', () => {
      presetManager.savePreset('Saved Preset', 'Author', 'Description');

      const stored = localStorageMock.getItem('synth-v2-presets');
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Saved Preset');
    });

    it('should overwrite existing preset with same name', () => {
      presetManager.savePreset('Test', 'Author1', 'Description1');
      presetManager.savePreset('Test', 'Author2', 'Description2');

      const names = presetManager.getUserPresetNames();
      expect(names.filter(n => n === 'Test')).toHaveLength(1);

      const preset = presetManager.getUserPreset('Test');
      expect(preset?.author).toBe('Author2');
    });

    it('should respect max preset limit (50)', () => {
      // Save 50 presets
      for (let i = 0; i < 50; i++) {
        presetManager.savePreset(`Preset ${i}`, 'Author', 'Description');
      }

      expect(() => {
        presetManager.savePreset('Preset 51', 'Author', 'Description');
      }).toThrow('Maximum of 50 user presets');
    });
  });

  describe('loadPreset', () => {
    it('should apply preset to voice state', () => {
      const preset = {
        name: 'Test',
        author: 'Author',
        description: 'Desc',
        oscillators: {
          1: { enabled: true, waveform: 'square' as const, octave: 1, detune: 10, volume: 0.5, pan: -0.5 },
          2: { enabled: true, waveform: 'triangle' as const, octave: 0, detune: 0, volume: 0.7, pan: 0.3 },
          3: { enabled: true, waveform: 'sine' as const, octave: -1, detune: -5, volume: 0.6, pan: 0 },
        },
        envelopes: {
          1: { attack: 0.5, decay: 0.2, sustain: 0.8, release: 1.0 },
          2: { attack: 0.3, decay: 0.15, sustain: 0.6, release: 0.8 },
          3: { attack: 0.1, decay: 0.1, sustain: 0.5, release: 0.5 },
        },
      };

      presetManager.loadPreset(preset);

      // Check oscillator 1
      const osc1 = voiceState.oscillatorConfigs.get(1)!;
      expect(osc1.waveform).toBe('square');
      expect(osc1.octave).toBe(1);
      expect(osc1.detune).toBe(10);
      expect(osc1.volume).toBe(0.5);
      expect(osc1.pan).toBe(-0.5);

      // Check envelope 1
      const env1 = voiceState.envelopeSettings[1];
      expect(env1.attack).toBe(0.5);
      expect(env1.decay).toBe(0.2);
      expect(env1.sustain).toBe(0.8);
      expect(env1.release).toBe(1.0);
    });

    it('should deep copy preset data', () => {
      const preset = presetManager.getCurrentPreset();
      preset.name = 'Original';
      
      presetManager.loadPreset(preset);

      // Modify loaded config
      voiceState.oscillatorConfigs.get(1)!.volume = 0.1;

      // Preset data should be unchanged
      expect(preset.oscillators[1].volume).toBe(0.8);
    });
  });

  describe('exportPreset', () => {
    it('should export preset as formatted JSON', () => {
      const preset = presetManager.getCurrentPreset();
      preset.name = 'Export Test';
      preset.author = 'Test Author';

      const json = presetManager.exportPreset(preset);

      expect(json).toContain('"name": "Export Test"');
      expect(json).toContain('"author": "Test Author"');

      // Should be valid JSON
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include all required fields', () => {
      const preset = presetManager.getCurrentPreset();
      preset.name = 'Complete';

      const json = presetManager.exportPreset(preset);
      const parsed = JSON.parse(json);

      expect(parsed.name).toBeDefined();
      expect(parsed.oscillators).toBeDefined();
      expect(parsed.oscillators[1]).toBeDefined();
      expect(parsed.oscillators[2]).toBeDefined();
      expect(parsed.oscillators[3]).toBeDefined();
      expect(parsed.envelopes).toBeDefined();
      expect(parsed.envelopes[1]).toBeDefined();
      expect(parsed.envelopes[2]).toBeDefined();
      expect(parsed.envelopes[3]).toBeDefined();
    });
  });

  describe('importPreset', () => {
    it('should import valid JSON preset', () => {
      const presetData = {
        name: 'Imported',
        author: 'Importer',
        description: 'Imported preset',
        oscillators: {
          1: { enabled: true, waveform: 'sine', octave: 0, detune: 0, volume: 0.8, pan: 0 },
          2: { enabled: false, waveform: 'sawtooth', octave: -1, detune: -7, volume: 0.6, pan: 0 },
          3: { enabled: false, waveform: 'square', octave: 1, detune: 7, volume: 0.5, pan: 0 },
        },
        envelopes: {
          1: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
          2: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
          3: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
        },
      };

      const json = JSON.stringify(presetData);
      const preset = presetManager.importPreset(json);

      expect(preset.name).toBe('Imported');
      expect(preset.author).toBe('Importer');
      expect(preset.oscillators[1].waveform).toBe('sine');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => {
        presetManager.importPreset('not valid json {{{');
      }).toThrow(); // Just check that it throws, error message may vary
    });

    it('should throw error for missing required fields', () => {
      const invalidPreset = {
        name: 'Invalid',
        // Missing oscillators and envelopes
      };

      expect(() => {
        presetManager.importPreset(JSON.stringify(invalidPreset));
      }).toThrow('Invalid preset format');
    });

    it('should throw error for missing name', () => {
      const invalidPreset = {
        // Missing name
        oscillators: { 1: {}, 2: {}, 3: {} },
        envelopes: { 1: {}, 2: {}, 3: {} },
      };

      expect(() => {
        presetManager.importPreset(JSON.stringify(invalidPreset));
      }).toThrow('Invalid preset format');
    });
  });

  describe('getUserPreset', () => {
    it('should retrieve saved user preset', () => {
      presetManager.savePreset('My Sound', 'Me', 'Cool');

      const preset = presetManager.getUserPreset('My Sound');

      expect(preset).toBeDefined();
      expect(preset?.name).toBe('My Sound');
    });

    it('should return undefined for non-existent preset', () => {
      const preset = presetManager.getUserPreset('Does Not Exist');
      expect(preset).toBeUndefined();
    });
  });

  describe('getUserPresetNames', () => {
    it('should return sorted list of preset names', () => {
      presetManager.savePreset('Zebra', 'Author', 'Desc');
      presetManager.savePreset('Apple', 'Author', 'Desc');
      presetManager.savePreset('Mango', 'Author', 'Desc');

      const names = presetManager.getUserPresetNames();

      expect(names).toEqual(['Apple', 'Mango', 'Zebra']);
    });

    it('should return empty array when no presets saved', () => {
      const names = presetManager.getUserPresetNames();
      expect(names).toEqual([]);
    });
  });

  describe('deletePreset', () => {
    it('should remove preset from storage', () => {
      presetManager.savePreset('To Delete', 'Author', 'Desc');

      expect(presetManager.getUserPresetNames()).toContain('To Delete');

      presetManager.deletePreset('To Delete');

      expect(presetManager.getUserPresetNames()).not.toContain('To Delete');
    });

    it('should persist deletion to localStorage', () => {
      presetManager.savePreset('Delete Me', 'Author', 'Desc');
      presetManager.deletePreset('Delete Me');

      const stored = localStorageMock.getItem('synth-v2-presets');
      const parsed = JSON.parse(stored!);

      expect(parsed.find((p: any) => p.name === 'Delete Me')).toBeUndefined();
    });

    it('should not throw when deleting non-existent preset', () => {
      expect(() => {
        presetManager.deletePreset('Does Not Exist');
      }).not.toThrow();
    });
  });

  describe('clearAllPresets', () => {
    it('should remove all user presets', () => {
      presetManager.savePreset('Preset 1', 'Author', 'Desc');
      presetManager.savePreset('Preset 2', 'Author', 'Desc');
      presetManager.savePreset('Preset 3', 'Author', 'Desc');

      expect(presetManager.getUserPresetNames()).toHaveLength(3);

      presetManager.clearAllPresets();

      expect(presetManager.getUserPresetNames()).toHaveLength(0);
    });

    it('should persist clearing to localStorage', () => {
      presetManager.savePreset('Clear Me', 'Author', 'Desc');
      presetManager.clearAllPresets();

      const stored = localStorageMock.getItem('synth-v2-presets');
      
      if (stored === null) {
        // Cleared by removing the key entirely
        expect(stored).toBeNull();
      } else {
        const parsed = JSON.parse(stored);
        expect(parsed).toEqual([]);
      }
    });
  });

  describe('localStorage integration', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw errors
      vi.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      // Should not throw, just log error
      expect(() => {
        presetManager.savePreset('Test', 'Author', 'Desc');
      }).not.toThrow();
    });

    it('should handle corrupt localStorage data', () => {
      // First restore the mock if it was modified
      vi.restoreAllMocks();
      
      localStorageMock.setItem('synth-v2-presets', 'corrupt data {{{');

      // Should not throw, just ignore corrupt data
      expect(() => {
        new PresetManager(voiceState);
      }).not.toThrow();
    });
  });

  describe('FM synthesis support', () => {
    it('should save and load FM parameters', () => {
      // Enable FM on oscillator 2
      voiceState.oscillatorConfigs.get(2)!.fmEnabled = true;
      voiceState.oscillatorConfigs.get(2)!.fmDepth = 800;

      const preset = presetManager.getCurrentPreset();
      expect(preset.oscillators[2].fmEnabled).toBe(true);
      expect(preset.oscillators[2].fmDepth).toBe(800);

      // Reset FM settings
      voiceState.oscillatorConfigs.get(2)!.fmEnabled = false;
      voiceState.oscillatorConfigs.get(2)!.fmDepth = 0;

      // Load preset
      presetManager.loadPreset(preset);

      // FM settings should be restored
      expect(voiceState.oscillatorConfigs.get(2)!.fmEnabled).toBe(true);
      expect(voiceState.oscillatorConfigs.get(2)!.fmDepth).toBe(800);
    });
  });
});
