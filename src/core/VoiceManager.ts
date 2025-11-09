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

import { VoiceStateManager, Voice, visualizationState } from "../state";
import { AudioEngine } from "./AudioEngine";
import { 
  SineOscillator, 
  SawtoothOscillator, 
  SquareOscillator, 
  TriangleOscillator,
  BaseOscillator 
} from "../components/oscillators";
import { ADSREnvelope } from "../components/envelopes/ADSREnvelope";
import type { LFOManager } from './LFOManager';

// Note frequencies for all 88 piano keys (A0 to C8, MIDI notes 21-108)
// Using standard MIDI note numbering where A4 = 440Hz = MIDI note 69
const NOTE_FREQUENCIES: { [key: number]: number } = {};

// Generate all frequencies using equal temperament formula: f = 440 * 2^((n-69)/12)
for (let midi = 21; midi <= 108; midi++) {
  NOTE_FREQUENCIES[midi] = 440 * Math.pow(2, (midi - 69) / 12);
}

const DEFAULT_MASTER_VOLUME = 0.3; // 30% to prevent clipping with multiple oscillators

export class VoiceManager {
  private audioEngine: AudioEngine;
  private voiceState: VoiceStateManager;
  private masterGain: GainNode;
  private osc1Bus: GainNode;
  private osc2Bus: GainNode;
  private osc3Bus: GainNode;
  private lfoManager: LFOManager | null = null;
  private lfoTargets: {
    pitch: boolean;
    volume: boolean;
    pan: boolean;
  } = { pitch: false, volume: false, pan: false };

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
    
    // Create per-oscillator buses for routing through analyzers
    this.osc1Bus = context.createGain();
    this.osc2Bus = context.createGain();
    this.osc3Bus = context.createGain();
    
    // Connect buses through analyzers to master gain
    // Signal flow: oscBus -> analyser -> masterGain -> destination
    this.osc1Bus.connect(visualizationState.analyser1);
    visualizationState.analyser1.connect(this.masterGain);
    
    this.osc2Bus.connect(visualizationState.analyser2);
    visualizationState.analyser2.connect(this.masterGain);
    
    this.osc3Bus.connect(visualizationState.analyser3);
    visualizationState.analyser3.connect(this.masterGain);
    
    console.log('🎵 VoiceManager created with oscillator buses and analyzers');
  }

  /**
   * Get the master gain node for external routing
   * @returns The master gain node
   */
  getMasterGainNode(): GainNode {
    return this.masterGain;
  }

  /**
   * Set the LFO manager for voice modulation
   * @param lfoManager - LFO manager instance
   */
  setLFOManager(lfoManager: LFOManager): void {
    this.lfoManager = lfoManager;
    console.log('LFO manager set for VoiceManager');
  }

  /**
   * Enable/disable LFO modulation for pitch
   * @param enabled - Whether pitch modulation is enabled
   * @param depth - Modulation depth percentage (0-100)
   */
  setLFOPitchTarget(enabled: boolean, depth: number): void {
    this.lfoTargets.pitch = enabled;
    
    if (!this.lfoManager) return;
    
    if (enabled) {
      // Add pitch targets for all active voices
      this.voiceState.activeVoices.forEach((voice, noteIndex) => {
        voice.oscillators.forEach((oscData) => {
          const targetName = `pitch_${noteIndex}_${oscData.oscNum}`;
          const oscNode = oscData.oscillator.getOscillatorNode();
          if (oscNode && oscNode.frequency) {
            const baseline = oscNode.frequency.value;
            // Depth: percentage to Hz (max 100 cents = semitone)
            const depthHz = (depth / 100) * baseline * 0.06; // ~100 cents at 100%
            this.lfoManager!.addTarget(targetName, oscNode.frequency, depthHz, baseline);
          }
        });
      });
      console.log(`🎯 LFO pitch modulation enabled (depth: ${depth}%)`);
    } else {
      // Remove all pitch targets
      this.voiceState.activeVoices.forEach((voice, noteIndex) => {
        voice.oscillators.forEach((oscData) => {
          const targetName = `pitch_${noteIndex}_${oscData.oscNum}`;
          this.lfoManager!.removeTarget(targetName);
        });
      });
      console.log('🎯 LFO pitch modulation disabled');
    }
  }

  /**
   * Enable/disable LFO modulation for volume
   * @param enabled - Whether volume modulation is enabled
   * @param depth - Modulation depth percentage (0-100)
   */
  setLFOVolumeTarget(enabled: boolean, depth: number): void {
    this.lfoTargets.volume = enabled;
    
    if (!this.lfoManager) return;
    
    if (enabled) {
      // Add volume targets for all active voices
      this.voiceState.activeVoices.forEach((voice, noteIndex) => {
        voice.oscillators.forEach((oscData) => {
          const targetName = `volume_${noteIndex}_${oscData.oscNum}`;
          const gainNode = oscData.oscillator.getOutputNode() as GainNode;
          const baseline = gainNode.gain.value;
          // Depth: percentage to gain (max 100% = full modulation)
          const depthValue = (depth / 100) * baseline;
          this.lfoManager!.addTarget(targetName, gainNode.gain, depthValue, baseline);
        });
      });
      console.log(`🎯 LFO volume modulation enabled (depth: ${depth}%)`);
    } else {
      // Remove all volume targets
      this.voiceState.activeVoices.forEach((voice, noteIndex) => {
        voice.oscillators.forEach((oscData) => {
          const targetName = `volume_${noteIndex}_${oscData.oscNum}`;
          this.lfoManager!.removeTarget(targetName);
        });
      });
      console.log('🎯 LFO volume modulation disabled');
    }
  }

  /**
   * Enable/disable LFO modulation for pan
   * @param enabled - Whether pan modulation is enabled
   * @param depth - Modulation depth percentage (0-100)
   */
  setLFOPanTarget(enabled: boolean, depth: number): void {
    this.lfoTargets.pan = enabled;
    
    if (!this.lfoManager) return;
    
    if (enabled) {
      // Add pan targets for all active voices
      this.voiceState.activeVoices.forEach((voice, noteIndex) => {
        voice.oscillators.forEach((oscData) => {
          const targetName = `pan_${noteIndex}_${oscData.oscNum}`;
          const baseline = oscData.panNode.pan.value;
          // Depth: percentage to pan (-1 to 1 range)
          const depthValue = (depth / 100) * 1.0; // Max 1.0 at 100%
          this.lfoManager!.addTarget(targetName, oscData.panNode.pan, depthValue, baseline);
        });
      });
      console.log(`🎯 LFO pan modulation enabled (depth: ${depth}%)`);
    } else {
      // Remove all pan targets
      this.voiceState.activeVoices.forEach((voice, noteIndex) => {
        voice.oscillators.forEach((oscData) => {
          const targetName = `pan_${noteIndex}_${oscData.oscNum}`;
          this.lfoManager!.removeTarget(targetName);
        });
      });
      console.log('🎯 LFO pan modulation disabled');
    }
  }

  /**
   * Play a note
   * @param noteIndex - Index of the note in the notes array
   * @param velocity - Note velocity (0-1)
   */
  playNote(noteIndex: number, velocity: number = 1.0, scheduleTime?: number): void {
    // Use AudioContext time for sample-accurate scheduling
    const context = this.audioEngine.getContext();
    const startTime = scheduleTime ?? context.currentTime;
    
    // If note is already playing, clean it up SYNCHRONOUSLY to allow instant retrigger
    if (this.voiceState.activeVoices.has(noteIndex)) {
      const existingVoice = this.voiceState.activeVoices.get(noteIndex);
      
      // Cancel any pending cleanup timeout
      if (existingVoice?.releaseTimeout) {
        clearTimeout(existingVoice.releaseTimeout);
      }
      
      // Stop oscillators at the scheduled time (sample-accurate)
      existingVoice?.oscillators.forEach(({ oscillator }) => {
        try {
          oscillator.stop(startTime);
        } catch (e) {
          // Ignore if already stopped
        }
      });
      
      // Remove from active voices immediately
      this.voiceState.activeVoices.delete(noteIndex);
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

        // Get the appropriate oscillator bus
        const oscBus = oscNum === 1 ? this.osc1Bus : oscNum === 2 ? this.osc2Bus : this.osc3Bus;

        // Connect: oscillator -> pan -> envelope -> oscBus (-> analyser -> master gain -> destination)
        oscillator.connect(panNode);
        panNode.connect(envelope.getInputNode());
        envelope.connect(oscBus);

        // Start the oscillator at scheduled time (sample-accurate)
        oscillator.start(startTime);

        // Trigger the envelope at scheduled time (sample-accurate)
        envelope.trigger(velocity, startTime);

        // Store oscillator data
        voice.oscillators.push({ oscillator, panNode, envelope, oscNum });
      }
    });
    
    // Handle FM modulation routing
    // Oscillators 2 and 3 can modulate oscillator 1's frequency
    this.setupFMRouting(voice);
    
    // Add LFO targets for this voice (if enabled)
    this.addLFOTargetsForVoice(voice, noteIndex);
    
    // Store the voice
    this.voiceState.activeVoices.set(noteIndex, voice);

    console.log(`🎹 Playing note ${noteIndex} (${baseFrequency.toFixed(2)} Hz) with ${voice.oscillators.length} oscillator(s)`);
  }

  /**
   * Add LFO targets for a newly created voice
   */
  private addLFOTargetsForVoice(voice: Voice, noteIndex: number): void {
    if (!this.lfoManager) return;

    voice.oscillators.forEach((oscData) => {
      // Add pitch target if enabled
      if (this.lfoTargets.pitch) {
        const oscNode = oscData.oscillator.getOscillatorNode();
        if (oscNode && oscNode.frequency) {
          const targetName = `pitch_${noteIndex}_${oscData.oscNum}`;
          const baseline = oscNode.frequency.value;
          const depthHz = baseline * 0.06; // ~100 cents max
          this.lfoManager!.addTarget(targetName, oscNode.frequency, depthHz, baseline);
        }
      }

      // Add volume target if enabled
      if (this.lfoTargets.volume) {
        const targetName = `volume_${noteIndex}_${oscData.oscNum}`;
        const gainNode = oscData.oscillator.getOutputNode() as GainNode;
        const baseline = gainNode.gain.value;
        const depthValue = baseline; // Full range
        this.lfoManager!.addTarget(targetName, gainNode.gain, depthValue, baseline);
      }

      // Add pan target if enabled
      if (this.lfoTargets.pan) {
        const targetName = `pan_${noteIndex}_${oscData.oscNum}`;
        const baseline = oscData.panNode.pan.value;
        const depthValue = 1.0; // Full pan range
        this.lfoManager!.addTarget(targetName, oscData.panNode.pan, depthValue, baseline);
      }
    });
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
  releaseNote(noteIndex: number, scheduleTime?: number): void {
    const voice = this.voiceState.activeVoices.get(noteIndex);
    if (!voice) return;

    // Cancel any existing cleanup timeout
    if (voice.releaseTimeout) {
      clearTimeout(voice.releaseTimeout);
    }

    // Trigger envelope release for all oscillators at scheduled time
    voice.oscillators.forEach(({ envelope }) => {
      envelope.triggerRelease(scheduleTime);
    });

    // Mark as inactive
    voice.isActive = false;

    // Schedule cleanup after release time
    const maxRelease = Math.max(
      ...voice.oscillators.map((_, idx) => 
        this.voiceState.envelopeSettings[(idx + 1) as 1 | 2 | 3].release
      )
    );

    voice.releaseTimeout = window.setTimeout(() => {
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

    // Cancel any pending timeout
    if (voice.releaseTimeout) {
      clearTimeout(voice.releaseTimeout);
    }

    // Remove LFO targets for this voice
    this.removeLFOTargetsForVoice(voice, noteIndex);

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
   * Remove LFO targets for a voice being cleaned up
   */
  private removeLFOTargetsForVoice(voice: Voice, noteIndex: number): void {
    if (!this.lfoManager) return;

    voice.oscillators.forEach((oscData) => {
      // Remove all possible target types
      const pitchTarget = `pitch_${noteIndex}_${oscData.oscNum}`;
      const volumeTarget = `volume_${noteIndex}_${oscData.oscNum}`;
      const panTarget = `pan_${noteIndex}_${oscData.oscNum}`;
      
      this.lfoManager!.removeTarget(pitchTarget);
      this.lfoManager!.removeTarget(volumeTarget);
      this.lfoManager!.removeTarget(panTarget);
    });
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



