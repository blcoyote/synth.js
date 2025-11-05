/**
 * AudioEngine - Core audio context manager
 * 
 * Manages the Web Audio API context and provides
 * centralized access to audio resources.
 */

import type { AudioContextConfig } from './types';

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private audioContext: AudioContext | null = null;
  private isInitialized: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of AudioEngine
   */
  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  /**
   * Initialize the audio context
   * Note: Must be called from a user interaction due to browser autoplay policies
   */
  public async initialize(config: AudioContextConfig = {}): Promise<void> {
    if (this.isInitialized) {
      console.warn('AudioEngine already initialized');
      return;
    }

    try {
      this.audioContext = new AudioContext({
        sampleRate: config.sampleRate,
        latencyHint: config.latencyHint || 'interactive',
      });

      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isInitialized = true;
      console.log('AudioEngine initialized:', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state,
        baseLatency: this.audioContext.baseLatency,
      });
    } catch (error) {
      console.error('Failed to initialize AudioEngine:', error);
      throw error;
    }
  }

  /**
   * Get the audio context
   * Throws if not initialized
   */
  public getContext(): AudioContext {
    if (!this.audioContext || !this.isInitialized) {
      throw new Error('AudioEngine not initialized. Call initialize() first.');
    }
    return this.audioContext;
  }

  /**
   * Get the destination (speakers/output)
   */
  public getDestination(): AudioDestinationNode {
    return this.getContext().destination;
  }

  /**
   * Get current time from audio context
   */
  public getCurrentTime(): number {
    return this.getContext().currentTime;
  }

  /**
   * Get sample rate
   */
  public getSampleRate(): number {
    return this.getContext().sampleRate;
  }

  /**
   * Check if audio context is running
   */
  public isRunning(): boolean {
    return this.audioContext?.state === 'running';
  }

  /**
   * Suspend audio context (pause all audio processing)
   */
  public async suspend(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'running') {
      await this.audioContext.suspend();
      console.log('AudioEngine suspended');
    }
  }

  /**
   * Resume audio context
   */
  public async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('AudioEngine resumed');
    }
  }

  /**
   * Close audio context and cleanup
   */
  public async close(): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
      this.isInitialized = false;
      AudioEngine.instance = null;
      console.log('AudioEngine closed');
    }
  }

  /**
   * Create a gain node
   */
  public createGain(initialValue: number = 1.0): GainNode {
    const gainNode = this.getContext().createGain();
    gainNode.gain.value = initialValue;
    return gainNode;
  }

  /**
   * Create an oscillator node
   */
  public createOscillator(type: OscillatorType = 'sine', frequency: number = 440): OscillatorNode {
    const osc = this.getContext().createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    return osc;
  }

  /**
   * Create a biquad filter node
   */
  public createBiquadFilter(type: BiquadFilterType = 'lowpass'): BiquadFilterNode {
    const filter = this.getContext().createBiquadFilter();
    filter.type = type;
    return filter;
  }

  /**
   * Create a delay node
   */
  public createDelay(maxDelayTime: number = 1.0): DelayNode {
    return this.getContext().createDelay(maxDelayTime);
  }

  /**
   * Create a stereo panner node
   */
  public createStereoPanner(): StereoPannerNode {
    return this.getContext().createStereoPanner();
  }

  /**
   * Create an analyser node
   */
  public createAnalyser(): AnalyserNode {
    return this.getContext().createAnalyser();
  }
}
