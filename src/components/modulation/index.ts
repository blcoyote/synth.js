/**
 * Modulation module exports
 * Note: LFO, Sequencer, and Arpeggiator legacy components removed
 * Use MultiTargetLFO for modulation, SequencerManager and ArpeggiatorManager for sequencing
 */

export { MultiTargetLFO } from './MultiTargetLFO';
export type { MultiTargetLFOConfig, LFOTarget, LFOWaveform } from './MultiTargetLFO';
