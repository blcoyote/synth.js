/**
 * PresetManager - Handles saving, loading, and managing synth presets
 * 
 * Responsibilities:
 * - Save current synth configuration as a preset
 * - Load presets and apply to synth
 * - Export/import presets as JSON
 * - Manage preset storage (localStorage)
 * - Provide default factory presets
 */

import type { VoiceStateManager } from '../../state';
import type { OscillatorConfig } from '../../state/voiceState';

export interface EnvelopeSettings {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface PresetData {
  name: string;
  author?: string;
  description?: string;
  oscillators: {
    1: OscillatorConfig;
    2: OscillatorConfig;
    3: OscillatorConfig;
  };
  envelopes: {
    1: EnvelopeSettings;
    2: EnvelopeSettings;
    3: EnvelopeSettings;
  };
}

const STORAGE_KEY = 'synth-v2-presets';
const MAX_USER_PRESETS = 50;

export class PresetManager {
  private voiceState: VoiceStateManager;
  private userPresets: Map<string, PresetData> = new Map();

  constructor(voiceState: VoiceStateManager) {
    this.voiceState = voiceState;
    this.loadPresetsFromStorage();
    console.log('💾 PresetManager created');
  }

  /**
   * Get the current synth configuration as a preset
   */
  getCurrentPreset(): PresetData {
    const oscillators = {
      1: { ...this.voiceState.oscillatorConfigs.get(1)! },
      2: { ...this.voiceState.oscillatorConfigs.get(2)! },
      3: { ...this.voiceState.oscillatorConfigs.get(3)! },
    };

    const envelopes = {
      1: { ...this.voiceState.envelopeSettings[1] },
      2: { ...this.voiceState.envelopeSettings[2] },
      3: { ...this.voiceState.envelopeSettings[3] },
    };

    return {
      name: 'Current',
      oscillators,
      envelopes,
    };
  }

  /**
   * Save the current configuration as a user preset
   */
  savePreset(name: string, author?: string, description?: string): void {
    if (!name || name.trim() === '') {
      throw new Error('Preset name cannot be empty');
    }

    if (this.userPresets.size >= MAX_USER_PRESETS) {
      throw new Error(`Maximum of ${MAX_USER_PRESETS} user presets reached`);
    }

    const preset = this.getCurrentPreset();
    preset.name = name.trim();
    preset.author = author;
    preset.description = description;

    this.userPresets.set(name, preset);
    this.savePresetsToStorage();

    console.log(`💾 Saved preset: "${name}"`);
  }

  /**
   * Load a preset and apply it to the synth
   */
  loadPreset(preset: PresetData): void {
    // Update oscillator configs
    this.voiceState.oscillatorConfigs.set(1, { ...preset.oscillators[1] });
    this.voiceState.oscillatorConfigs.set(2, { ...preset.oscillators[2] });
    this.voiceState.oscillatorConfigs.set(3, { ...preset.oscillators[3] });

    // Update envelope settings
    this.voiceState.envelopeSettings[1] = { ...preset.envelopes[1] };
    this.voiceState.envelopeSettings[2] = { ...preset.envelopes[2] };
    this.voiceState.envelopeSettings[3] = { ...preset.envelopes[3] };

    console.log(`💾 Loaded preset: "${preset.name}"`);
  }

  /**
   * Get a user preset by name
   */
  getUserPreset(name: string): PresetData | undefined {
    return this.userPresets.get(name);
  }

  /**
   * Get all user preset names
   */
  getUserPresetNames(): string[] {
    return Array.from(this.userPresets.keys()).sort();
  }

  /**
   * Delete a user preset
   */
  deletePreset(name: string): boolean {
    const deleted = this.userPresets.delete(name);
    if (deleted) {
      this.savePresetsToStorage();
      console.log(`💾 Deleted preset: "${name}"`);
    }
    return deleted;
  }

  /**
   * Export a preset as JSON string
   */
  exportPreset(preset: PresetData): string {
    return JSON.stringify(preset, null, 2);
  }

  /**
   * Import a preset from JSON string
   */
  importPreset(jsonString: string): PresetData {
    try {
      const preset = JSON.parse(jsonString) as PresetData;
      
      // Validate preset structure
      if (!preset.name || !preset.oscillators || !preset.envelopes) {
        throw new Error('Invalid preset format');
      }

      return preset;
    } catch (error) {
      throw new Error(`Failed to import preset: ${error}`);
    }
  }

  /**
   * Save user presets to localStorage
   */
  private savePresetsToStorage(): void {
    try {
      const presetsArray = Array.from(this.userPresets.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presetsArray));
    } catch (error) {
      console.error('Failed to save presets to localStorage:', error);
    }
  }

  /**
   * Load user presets from localStorage
   */
  private loadPresetsFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const presetsArray = JSON.parse(stored) as PresetData[];
        this.userPresets = new Map(presetsArray.map(p => [p.name, p]));
        console.log(`💾 Loaded ${this.userPresets.size} user presets from storage`);
      }
    } catch (error) {
      console.error('Failed to load presets from localStorage:', error);
    }
  }

  /**
   * Clear all user presets
   */
  clearAllPresets(): void {
    this.userPresets.clear();
    localStorage.removeItem(STORAGE_KEY);
    console.log('💾 Cleared all user presets');
  }
}
