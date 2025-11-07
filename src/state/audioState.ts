/**
 * Audio State Module
 * 
 * Manages audio engine state including buses, effects chain, and filters
 */

import type { BusManager } from '../bus/BusManager';
import type { EffectsChain } from '../bus/EffectsChain';
import type { Lowpass12Filter, Lowpass24Filter } from '../components/filters';

const DEFAULT_FILTER_CUTOFF = 2000;

class AudioStateManager {
  // Audio routing
  private _masterBus: ReturnType<typeof BusManager.prototype.getMasterBus> | null = null;
  private _effectsChain: EffectsChain | null = null;
  
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

  // Getters with null checks
  get masterBus(): ReturnType<typeof BusManager.prototype.getMasterBus> {
    if (this._masterBus === null) {
      throw new Error('MasterBus is not initialized. Call initialize() first.');
    }
    return this._masterBus;
  }

  get effectsChain(): EffectsChain {
    if (this._effectsChain === null) {
      throw new Error('EffectsChain is not initialized. Call initialize() first.');
    }
    return this._effectsChain;
  }

  get masterFilter() {
    return this._masterFilter;
  }

  get currentCustomFilter() {
    return this._currentCustomFilter;
  }

  // Setters
  setMasterBus(bus: ReturnType<typeof BusManager.prototype.getMasterBus>) {
    this._masterBus = bus;
  }

  setEffectsChain(chain: EffectsChain | null) {
    this._effectsChain = chain;
  }

  setMasterFilter(filter: BiquadFilterNode | Lowpass12Filter | Lowpass24Filter | null) {
    this._masterFilter = filter;
  }

  setCurrentCustomFilter(filter: Lowpass12Filter | Lowpass24Filter | null) {
    this._currentCustomFilter = filter;
  }
}

export const audioState = new AudioStateManager();
