/**
 * SynthEngine - Main audio engine coordinator for Synth V2
 * Initializes and manages the core audio system
 * 
 * Responsibilities:
 * - Initialize AudioEngine singleton
 * - Set up state modules
 * - Coordinate VoiceManager and ParameterManager
 * - Manage audio context lifecycle
 */

import { AudioEngine } from '../../core/AudioEngine';
import { voiceState } from '../../state';
import { VoiceManager } from './VoiceManager';
import { ParameterManager } from './ParameterManager';

export class SynthEngine {
  private audioEngine: AudioEngine;
  private voiceManager: VoiceManager;
  private parameterManager: ParameterManager;
  private isInitialized: boolean = false;

  constructor() {
    this.audioEngine = AudioEngine.getInstance();
    this.voiceManager = new VoiceManager();
    this.parameterManager = new ParameterManager(this.voiceManager);
  }

  /**
   * Initialize the synth engine
   * Must be called before any audio operations
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('SynthEngine already initialized');
      return;
    }

    try {
      // Initialize audio engine
      await this.audioEngine.initialize();
      
      // Initialize voice manager (creates master gain node)
      this.voiceManager.initialize();
      
      // Initialize oscillator configurations (3 oscillators)
      voiceState.oscillatorConfigs.set(1, {
        enabled: true,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.8,
        pan: 0,
      });

      voiceState.oscillatorConfigs.set(2, {
        enabled: false,
        waveform: 'sawtooth',
        octave: -1,
        detune: -7,
        volume: 0.6,
        pan: 0,
      });

      voiceState.oscillatorConfigs.set(3, {
        enabled: false,
        waveform: 'square',
        octave: 1,
        detune: 7,
        volume: 0.5,
        pan: 0,
      });

      console.log(`🎛️ Initialized ${voiceState.oscillatorConfigs.size} oscillator configs`);
      
      // Initialize state modules (will be implemented when we need them)
      // TODO: Set up buses, effects chain, filters, etc.
      
      this.isInitialized = true;
      console.log('✅ SynthEngine initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SynthEngine:', error);
      throw error;
    }
  }

  /**
   * Get the VoiceManager instance
   */
  getVoiceManager(): VoiceManager {
    return this.voiceManager;
  }

  /**
   * Get the ParameterManager instance
   */
  getParameterManager(): ParameterManager {
    return this.parameterManager;
  }

  /**
   * Get the AudioEngine instance
   */
  getAudioEngine(): AudioEngine {
    return this.audioEngine;
  }

  /**
   * Check if engine is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup and destroy the synth engine
   */
  destroy(): void {
    // TODO: Cleanup voices, disconnect nodes, etc.
    this.isInitialized = false;
    console.log('🔌 SynthEngine destroyed');
  }
}
