/**
 * Audio State Module
 * 
 * Manages audio engine state including effects and filters (V2)
 */

import type { Lowpass12Filter, Lowpass24Filter } from '../components/filters';
import type { EffectsManager } from '../synth-v2/core/EffectsManager';

const DEFAULT_FILTER_CUTOFF = 2000;

export class AudioStateManager {
  // Audio routing (V2)
  private _effectsManager: EffectsManager | null = null;
  
  // Filter instances
  private _masterFilter: BiquadFilterNode | Lowpass12Filter | Lowpass24Filter | null = null;
  private _currentCustomFilter: Lowpass12Filter | Lowpass24Filter | null = null;
  
  // Filter settings
  public filterSettings = {
    enabled: false,
    type: 'lowpass' as BiquadFilterType | 'lowpass12' | 'lowpass24',
    cutoff: DEFAULT_FILTER_CUTOFF,
    resonance: 1.0,
  };

  // Getters
  get masterFilter() {
    return this._masterFilter;
  }

  get currentCustomFilter() {
    return this._currentCustomFilter;
  }

  // Setters
  setMasterFilter(filter: BiquadFilterNode | Lowpass12Filter | Lowpass24Filter | null) {
    this._masterFilter = filter;
  }

  setCurrentCustomFilter(filter: Lowpass12Filter | Lowpass24Filter | null) {
    this._currentCustomFilter = filter;
  }

  // Effects Manager (V2)
  getEffectsManager(): EffectsManager {
    if (this._effectsManager === null) {
      throw new Error('EffectsManager is not initialized. Call initialize() first.');
    }
    return this._effectsManager;
  }

  getEffectsManagerOrNull(): EffectsManager | null {
    return this._effectsManager;
  }

  setEffectsManager(manager: EffectsManager) {
    this._effectsManager = manager;
  }
}

export const audioState = new AudioStateManager();
