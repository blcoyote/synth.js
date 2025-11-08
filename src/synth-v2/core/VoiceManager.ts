/**
 * VoiceManager - Manages voice lifecycle and polyphony
 * 
 * Responsibilities:
 * - Create and manage active voices
 * - Handle note on/off events
 * - Apply real-time parameter updates to active voices
 * - Voice pooling for performance
 * 
 * @remarks
 * Dependencies are injected for testability. All state access goes through
 * the provided VoiceStateManager interface.
 */

import { VoiceStateManager, Voice } from '../../state';
import { AudioEngine } from '../../core/AudioEngine';
import { 
  SineOscillator, 
  SawtoothOscillator, 
  SquareOscillator, 
  TriangleOscillator,
  BaseOscillator 
} from '../../components/oscillators';
import { ADSREnvelope } from '../../components/envelopes/ADSREnvelope';

// Note frequencies (C2 to C7, chromatic scale)
const NOTE_FREQUENCIES = [
  65.41, 69.30, 73.42, 77.78, 82.41, 87.31, 92.50, 98.00, 103.83, 110.00, 116.54, 123.47, // C2-B2
  130.81, 138.59, 146.83, 155.56, 164.81, 174.61, 185.00, 196.00, 207.65, 220.00, 233.08, 246.94, // C3-B3
  261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88, // C4-B4
  523.25, 554.37, 587.33, 622.25, 659.25, 698.46, 739.99, 783.99, 830.61, 880.00, 932.33, 987.77, // C5-B5
  1046.50, 1108.73, 1174.66, 1244.51, 1318.51, 1396.91, 1479.98, 1567.98, 1661.22, 1760.00, 1864.66, 1975.53, // C6-B6
  2093.00, // C7
];

const DEFAULT_MASTER_VOLUME = 0.3; // 30% to prevent clipping with multiple oscillators

export class VoiceManager {
  private audioEngine: AudioEngine;
  private voiceState: VoiceStateManager;
  private masterGain: GainNode;

  /**
   * Creates a new VoiceManager
   * @param audioEngine - Audio engine instance (must be initialized)
   * @param voiceState - Voice state manager for storing active voices
   */
  constructor(audioEngine: AudioEngine, voiceState: VoiceStateManager) {
    this.audioEngine = audioEngine;
    this.voiceState = voiceState;
    
    // Create master gain node for all voices
    const context = this.audioEngine.getContext();
    this.masterGain = context.createGain();
    this.masterGain.gain.value = DEFAULT_MASTER_VOLUME;
    this.masterGain.connect(context.destination);
    
    console.log('🎵 VoiceManager created and initialized');
  }

  private getMasterGain(): GainNode {
    return this.masterGain;
  }

  /**
   * Play a note
   * @param noteIndex - Index of the note in the notes array
   * @param velocity - Note velocity (0-1)
   */
  playNote(noteIndex: number, velocity: number = 1.0): void {
    // Stop any existing note at this index
    if (this.voiceState.activeVoices.has(noteIndex)) {
      this.releaseNote(noteIndex);
    }

    const baseFrequency = NOTE_FREQUENCIES[noteIndex];
    if (!baseFrequency) {
      console.warn(`Invalid note index: ${noteIndex}`);
      return;
    }

    // Create a new voice
    const voice: Voice = {
      noteIndex,
      baseFrequency,
      oscillators: [],
      isActive: true,
    };

    const context = this.audioEngine.getContext();

    // Create oscillators for each enabled config
    this.voiceState.oscillatorConfigs.forEach((config, oscNum) => {
      if (config.enabled) {
        const freq = baseFrequency * Math.pow(2, config.octave);

        // Create oscillator based on waveform
        let oscillator: BaseOscillator;
        switch (config.waveform) {
          case 'sine':
            oscillator = new SineOscillator(freq);
            break;
          case 'sawtooth':
            oscillator = new SawtoothOscillator(freq);
            break;
          case 'square':
            oscillator = new SquareOscillator(freq);
            break;
          case 'triangle':
            oscillator = new TriangleOscillator(freq);
            break;
        }

        // Apply settings
        oscillator.setParameter('volume', config.volume);
        oscillator.setParameter('detune', config.detune);

        // Create pan node
        const panNode = context.createStereoPanner();
        panNode.pan.value = config.pan;

        // Create envelope for this oscillator
        const envelope = new ADSREnvelope(this.voiceState.envelopeSettings[oscNum as 1 | 2 | 3]);

        // Connect: oscillator -> pan -> envelope -> master gain -> destination
        oscillator.connect(panNode);
        panNode.connect(envelope.getInputNode());
        envelope.connect(this.getMasterGain());

        // Start the oscillator
        oscillator.start();

        // Trigger the envelope
        envelope.trigger(velocity);

        // Store oscillator data
        voice.oscillators.push({ oscillator, panNode, envelope, oscNum });
      }
    });
    
    // Handle FM modulation routing
    // Oscillators 2 and 3 can modulate oscillator 1's frequency
    this.setupFMRouting(voice);
    
    // Store the voice
    this.voiceState.activeVoices.set(noteIndex, voice);

    console.log(`🎹 Playing note ${noteIndex} (${baseFrequency.toFixed(2)} Hz) with ${voice.oscillators.length} oscillator(s)`);
  }

  /**
   * Setup FM modulation routing for a voice
   * Oscillators 2 and 3 can modulate oscillator 1's frequency
   */
  private setupFMRouting(voice: Voice): void {
    const context = this.audioEngine.getContext();
    
    // Find oscillator 1 (carrier)
    const osc1Data = voice.oscillators.find(data => data.oscNum === 1);
    if (!osc1Data) return; // No carrier to modulate
    
    const carrierNode = osc1Data.oscillator.getOscillatorNode();
    if (!carrierNode || !carrierNode.frequency) return;
    
    // Check oscillators 2 and 3 for FM modulation
    voice.oscillators.forEach(modulatorData => {
      const oscNum = modulatorData.oscNum;
      if (oscNum < 2) return; // Only osc 2 & 3 can be modulators
      
      const config = this.voiceState.oscillatorConfigs.get(oscNum);
      if (!config?.fmEnabled || !config.fmDepth || config.fmDepth === 0) return;
      
      // Create FM gain node to scale modulation depth
      const fmGain = context.createGain();
      fmGain.gain.value = config.fmDepth;
      
      // FM routing: modulator oscillator -> fmGain -> carrier frequency parameter
      // Note: The modulator is already connected to its envelope/pan
      // We need to connect it to the FM path as well
      modulatorData.oscillator.connect(fmGain);
      fmGain.connect(carrierNode.frequency);
      
      console.log(`🎛️ FM: Osc${oscNum} -> Osc1 (depth: ${config.fmDepth} Hz)`);
    });
  }

  /**
   * Release a note
   * @param noteIndex - Index of the note to release
   */
  releaseNote(noteIndex: number): void {
    const voice = this.voiceState.activeVoices.get(noteIndex);
    if (!voice) return;

    // Trigger envelope release for all oscillators
    voice.oscillators.forEach(({ envelope }) => {
      envelope.triggerRelease();
    });

    // Mark as inactive
    voice.isActive = false;

    // Schedule cleanup after release time
    const maxRelease = Math.max(
      ...voice.oscillators.map((_, idx) => 
        this.voiceState.envelopeSettings[(idx + 1) as 1 | 2 | 3].release
      )
    );

    setTimeout(() => {
      this.cleanupVoice(noteIndex);
    }, maxRelease * 1000 + 100); // Add 100ms buffer

    console.log(`🎹 Releasing note ${noteIndex}`);
  }

  /**
   * Cleanup a voice and remove it
   */
  private cleanupVoice(noteIndex: number): void {
    const voice = this.voiceState.activeVoices.get(noteIndex);
    if (!voice) return;

    // Stop and disconnect all oscillators
    voice.oscillators.forEach(({ oscillator, panNode, envelope }) => {
      oscillator.stop();
      oscillator.disconnect();
      panNode.disconnect();
      envelope.disconnect();
    });

    // Remove from active voices
    this.voiceState.activeVoices.delete(noteIndex);
    
    console.log(`🧹 Cleaned up note ${noteIndex}`);
  }

  /**
   * Stop all playing notes immediately
   */
  stopAllNotes(): void {
    console.log('⏹️ Stopping all notes');
    
    this.voiceState.activeVoices.forEach((_, noteIndex) => {
      this.cleanupVoice(noteIndex);
    });
    
    this.voiceState.clearActiveVoices();
  }

  /**
   * Update a parameter on all active voices
   * This is called by ParameterManager for real-time updates
   */
  updateActiveVoices(
    oscNum: number,
    parameterName: string,
    value: number
  ): void {
    this.voiceState.activeVoices.forEach((voice) => {
      voice.oscillators.forEach((oscData) => {
        if (oscData.oscNum === oscNum) {
          switch (parameterName) {
            case 'volume':
              oscData.oscillator.setParameter('volume', value);
              break;
            case 'pan':
              oscData.panNode.pan.value = value;
              break;
            case 'detune':
              oscData.oscillator.setParameter('detune', value);
              break;
            case 'octave':
              // Recalculate frequency with new octave
              const newFrequency = voice.baseFrequency * Math.pow(2, value);
              oscData.oscillator.setParameter('frequency', newFrequency);
              break;
          }
        }
      });
    });
    
    console.log(`🔧 Updated ${parameterName} to ${value} for osc ${oscNum} on ${this.voiceState.activeVoices.size} active voice(s)`);
  }

  /**
   * Get the number of currently active voices
   */
  getActiveVoiceCount(): number {
    return this.voiceState.activeVoices.size;
  }
}
