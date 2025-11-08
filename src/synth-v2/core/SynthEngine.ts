/**
 * SynthEngine - Main audio engine coordinator for Synth V2
 * Initializes and manages the core audio system
 * 
 * Responsibilities:
 * - Initialize AudioEngine
 * - Set up state modules
 * - Coordinate VoiceManager and ParameterManager
 * - Manage audio context lifecycle
 * 
 * @remarks
 * All dependencies are properly injected for testability.
 * AudioEngine must be initialized before creating VoiceManager.
 */

import { AudioEngine } from '../../core/AudioEngine';
import { voiceState, audioState, visualizationState, modulationState } from '../../state';
import { VoiceManager } from './VoiceManager';
import { ParameterManager } from './ParameterManager';
import { PresetManager } from './PresetManager';
import { EffectsManager } from './EffectsManager';
import { LFOManager } from './LFOManager';

export class SynthEngine {
  private audioEngine: AudioEngine;
  private voiceManager: VoiceManager | null = null;
  private parameterManager: ParameterManager | null = null;
  private presetManager: PresetManager | null = null;
  private effectsManager: EffectsManager | null = null;
  private lfoManager: LFOManager | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.audioEngine = AudioEngine.getInstance();
    // VoiceManager and ParameterManager are created in initialize()
    // after AudioEngine is ready
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
      
      // Create analyser nodes BEFORE VoiceManager (it needs them in constructor)
      const context = this.audioEngine.getContext();
      
      const analyser1 = context.createAnalyser();
      analyser1.fftSize = 2048;
      analyser1.smoothingTimeConstant = 0.9; // More smoothing for stable waveforms
      visualizationState.setAnalyser1(analyser1);
      
      const analyser2 = context.createAnalyser();
      analyser2.fftSize = 2048;
      analyser2.smoothingTimeConstant = 0.9;
      visualizationState.setAnalyser2(analyser2);
      
      const analyser3 = context.createAnalyser();
      analyser3.fftSize = 2048;
      analyser3.smoothingTimeConstant = 0.9;
      visualizationState.setAnalyser3(analyser3);
      
      console.log('📊 Created waveform analyzers for 3 oscillators');
      
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
      
      // Create master filter (default: lowpass at 20kHz, essentially bypassed)
      const masterFilter = context.createBiquadFilter();
      masterFilter.type = 'lowpass';
      masterFilter.frequency.value = 20000; // Wide open by default
      masterFilter.Q.value = 1.0;
      audioState.setMasterFilter(masterFilter);
      audioState.filterSettings.type = 'lowpass';
      audioState.filterSettings.cutoff = 20000;
      audioState.filterSettings.resonance = 1.0;
      audioState.filterSettings.enabled = false;
      
      console.log('🎚️ Created master filter (bypassed by default)');
      
      // Now create voice manager with initialized audio engine AND analyzers
      // VoiceManager will connect: masterGain -> destination
      // We'll reconnect it to go through filter: masterGain -> filter -> destination
      this.voiceManager = new VoiceManager(this.audioEngine, voiceState);
      
      // Create spectrum analyser (for filter visualization)
      const spectrumAnalyser = context.createAnalyser();
      spectrumAnalyser.fftSize = 8192; // High resolution for frequency visualization
      spectrumAnalyser.smoothingTimeConstant = 0.75;
      visualizationState.setAnalyser(spectrumAnalyser);
      
      // Create effects manager
      this.effectsManager = new EffectsManager(this.audioEngine);
      audioState.setEffectsManager(this.effectsManager);
      console.log('🎛️ Created effects manager');
      
      // Reconnect masterGain through filter -> effects -> analyser
      const masterGainNode = this.voiceManager.getMasterGainNode();
      masterGainNode.disconnect();
      masterGainNode.connect(masterFilter);
      masterFilter.connect(this.effectsManager.getInputNode());
      this.effectsManager.getOutputNode().connect(spectrumAnalyser);
      spectrumAnalyser.connect(context.destination);
      
      console.log('🔗 Audio chain: oscBuses -> analyzers -> masterGain -> filter -> effects -> spectrumAnalyser -> destination');
      console.log('📊 Created spectrum analyser for filter visualization');
      
      // Create parameter manager with dependencies
      this.parameterManager = new ParameterManager(this.voiceManager, voiceState, audioState);
      
      // Create preset manager
      this.presetManager = new PresetManager(voiceState);
      
      // Create LFO manager
      this.lfoManager = new LFOManager();
      modulationState.setMultiLFO(this.lfoManager.getLFO());
      console.log('🌊 Created LFO manager');
      
      // Connect LFO manager to voice manager for voice-level modulation
      this.voiceManager.setLFOManager(this.lfoManager);
      console.log('🔗 Connected LFO manager to voice manager');
      
      this.isInitialized = true;
      console.log('✅ SynthEngine initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SynthEngine:', error);
      throw error;
    }
  }

  /**
   * Get the VoiceManager instance
   * @throws Error if called before initialization
   */
  getVoiceManager(): VoiceManager {
    if (!this.voiceManager) {
      throw new Error('VoiceManager not initialized. Call initialize() first.');
    }
    return this.voiceManager;
  }

  /**
   * Get the ParameterManager instance
   * @throws Error if called before initialization
   */
  getParameterManager(): ParameterManager {
    if (!this.parameterManager) {
      throw new Error('ParameterManager not initialized. Call initialize() first.');
    }
    return this.parameterManager;
  }

  /**
   * Get the PresetManager instance
   * @throws Error if called before initialization
   */
  getPresetManager(): PresetManager {
    if (!this.presetManager) {
      throw new Error('PresetManager not initialized. Call initialize() first.');
    }
    return this.presetManager;
  }

  /**
   * Get the EffectsManager instance
   * @throws Error if called before initialization
   */
  getEffectsManager(): EffectsManager {
    if (!this.effectsManager) {
      throw new Error('EffectsManager not initialized. Call initialize() first.');
    }
    return this.effectsManager;
  }

  /**
   * Get the LFOManager instance
   * @throws Error if called before initialization
   */
  getLFOManager(): LFOManager {
    if (!this.lfoManager) {
      throw new Error('LFOManager not initialized. Call initialize() first.');
    }
    return this.lfoManager;
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
