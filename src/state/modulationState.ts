/**
 * Modulation State Module
 * 
 * Manages LFO, sequencer, and arpeggiator state
 */

import type { LFO } from '../components/modulation/LFO';
import type { MultiTargetLFO } from '../components/modulation/MultiTargetLFO';
import type { Sequencer } from '../components/modulation/Sequencer';
import type { Arpeggiator } from '../components/modulation/Arpeggiator';

class ModulationStateManager {
  // LFO instances
  private _lfo: LFO | null = null;
  private _multiLFO: MultiTargetLFO | null = null;

  // Sequencer
  private _sequencer: Sequencer | null = null;
  private _selectedStepIndex: number | null = null;

  // Arpeggiator
  private _arpeggiator: Arpeggiator | null = null;
  private _arpeggiatorEnabled = false;

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
  get lfo(): LFO {
    if (this._lfo === null) {
      throw new Error('LFO is not initialized. Call initialize() first.');
    }
    return this._lfo;
  }

  get multiLFO() {
    return this._multiLFO;
  }

  get sequencer() {
    return this._sequencer;
  }

  get selectedStepIndex() {
    return this._selectedStepIndex;
  }

  get arpeggiator() {
    return this._arpeggiator;
  }

  get arpeggiatorEnabled() {
    return this._arpeggiatorEnabled;
  }

  // Setters
  setLfo(lfo: LFO | null) {
    this._lfo = lfo;
  }

  setMultiLFO(multiLFO: MultiTargetLFO | null) {
    this._multiLFO = multiLFO;
  }

  setSequencer(sequencer: Sequencer | null) {
    this._sequencer = sequencer;
  }

  setSelectedStepIndex(index: number | null) {
    this._selectedStepIndex = index;
  }

  setArpeggiator(arpeggiator: Arpeggiator | null) {
    this._arpeggiator = arpeggiator;
  }

  setArpeggiatorEnabled(enabled: boolean) {
    this._arpeggiatorEnabled = enabled;
  }
}

export const modulationState = new ModulationStateManager();
