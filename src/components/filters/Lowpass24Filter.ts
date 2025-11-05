/**
 * Lowpass24Filter - Low-pass filter with 24dB/octave slope
 * 
 * Allows frequencies below the cutoff to pass through,
 * attenuates frequencies above the cutoff with a steep slope.
 * 
 * This is achieved by cascading two 12dB/octave filters in series,
 * creating a 4-pole (24dB/octave) response.
 * 
 * Classic use: Aggressive filtering, classic synthesizer sounds,
 * steep cutoff for electronic music, Moog-style filtering
 * 
 * Slope: 24dB/octave (4-pole filter, two cascaded biquads)
 */

import { AudioEngine } from '../../core/AudioEngine';
import { BaseFilter } from './BaseFilter';

export class Lowpass24Filter extends BaseFilter {
  private secondStage: BiquadFilterNode;

  constructor(cutoffFrequency: number = 1000) {
    super('Lowpass 24dB', 'lowpass', cutoffFrequency);
    
    // Create second filter stage for 24dB/octave slope
    this.secondStage = AudioEngine.getInstance().createBiquadFilter('lowpass');
    this.secondStage.frequency.value = cutoffFrequency;
    this.secondStage.Q.value = this.filterNode.Q.value;
    
    // Reconnect: input -> first stage -> second stage -> output
    this.reconnectStages();
  }

  /**
   * Reconnect the two filter stages
   */
  private reconnectStages(): void {
    // Disconnect existing connections
    this.filterNode.disconnect();
    
    // Chain: first stage -> second stage -> output
    this.filterNode.connect(this.secondStage);
    this.secondStage.connect(this.outputGain);
  }

  /**
   * Override setParameter to update both stages
   */
  override setParameter(name: string, value: number): void {
    super.setParameter(name, value);
    
    const now = this.engine.getCurrentTime();
    
    // Update second stage to match
    if ((name === 'cutoff' || name === 'frequency') && this.secondStage) {
      // Use the clamped frequency value from parent
      this.secondStage.frequency.exponentialRampToValueAtTime(this.frequency, now + 0.01);
    } else if ((name === 'resonance' || name === 'Q') && this.secondStage) {
      // Use the clamped resonance value from parent
      this.secondStage.Q.linearRampToValueAtTime(this.resonance, now + 0.01);
    }
  }

  /**
   * Override disconnect to clean up second stage
   */
  override disconnect(): void {
    if (this.secondStage) {
      this.secondStage.disconnect();
    }
    super.disconnect();
  }

  /**
   * Get the second stage filter node (for advanced use)
   */
  getSecondStage(): BiquadFilterNode {
    return this.secondStage;
  }

  /**
   * Get cascaded frequency response for visualization
   * This creates a virtual BiquadFilterNode-like interface that shows the combined response
   */
  getCascadedFrequencyResponse(): BiquadFilterNode {
    // Create a proxy object that looks like a BiquadFilterNode but calculates cascaded response
    const self = this;
    return {
      getFrequencyResponse(frequencyArray: Float32Array, magResponseOutput: Float32Array, phaseResponseOutput: Float32Array): void {
        // Get response from first stage
        const mag1 = new Float32Array(frequencyArray.length);
        const phase1 = new Float32Array(frequencyArray.length);
        self.filterNode.getFrequencyResponse(
          frequencyArray as Float32Array<ArrayBuffer>,
          mag1 as Float32Array<ArrayBuffer>,
          phase1 as Float32Array<ArrayBuffer>
        );
        
        // Get response from second stage
        const mag2 = new Float32Array(frequencyArray.length);
        const phase2 = new Float32Array(frequencyArray.length);
        self.secondStage.getFrequencyResponse(
          frequencyArray as Float32Array<ArrayBuffer>,
          mag2 as Float32Array<ArrayBuffer>,
          phase2 as Float32Array<ArrayBuffer>
        );
        
        // Multiply magnitudes (in linear scale) and add phases for cascaded response
        for (let i = 0; i < frequencyArray.length; i++) {
          magResponseOutput[i] = mag1[i] * mag2[i]; // Cascaded magnitude (24dB/octave)
          phaseResponseOutput[i] = phase1[i] + phase2[i]; // Cascaded phase
        }
      }
    } as BiquadFilterNode;
  }
}
