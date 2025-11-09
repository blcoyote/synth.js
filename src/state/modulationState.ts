/**
 * Modulation State Module
 * 
 * Manages LFO state
 * Note: Sequencer and Arpeggiator are now managed by SequencerManager and ArpeggiatorManager in core/
 */

import type { MultiTargetLFO } from '../components/modulation/MultiTargetLFO';

class ModulationStateManager {
  // LFO instances
  private _multiLFO: MultiTargetLFO | null = null;

  // LFO configuration
  public lfoState = {
    enabled: false,
    mode: 'free' as 'free' | 'trigger',
    targets: {
      pitch: true,
      volume: false,
      pan: false,
      filter: false,
    },
  };

  // Getters with null checks
  get multiLFO() {
    return this._multiLFO;
  }

  // Setters
  setMultiLFO(multiLFO: MultiTargetLFO | null) {
    this._multiLFO = multiLFO;
  }
}

export const modulationState = new ModulationStateManager();
