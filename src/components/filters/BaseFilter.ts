/**
 * BaseFilter - Abstract base class for all filters
 * 
 * Provides common functionality for filter components including:
 * - Frequency (cutoff) control with smooth ramping
 * - Resonance (Q) control
 * - Gain control for certain filter types
 * - Enable/disable functionality
 * - Connection management
 */

import type { AudioComponent, ParameterDescriptor } from '../../core/types';
import { AudioEngine } from '../../core/AudioEngine';

export abstract class BaseFilter implements AudioComponent {
  protected engine: AudioEngine;
  protected filterNode: BiquadFilterNode;
  protected inputGain: GainNode;
  protected outputGain: GainNode;
  protected enabled: boolean = true;
  protected name: string;
  protected filterType: BiquadFilterType;
  
  // Current parameter values
  protected frequency: number = 1000;
  protected resonance: number = 1;
  protected gain: number = 0;

  constructor(name: string, type: BiquadFilterType, frequency: number = 1000) {
    this.engine = AudioEngine.getInstance();
    this.name = name;
    this.filterType = type;
    this.frequency = frequency;
    
    // Create nodes
    this.inputGain = this.engine.createGain(1.0);
    this.filterNode = this.engine.createBiquadFilter(type);
    this.outputGain = this.engine.createGain(1.0);
    
    // Set initial filter parameters
    this.filterNode.frequency.value = this.frequency;
    this.filterNode.Q.value = this.resonance;
    this.filterNode.gain.value = this.gain;
    
    // Connect: input -> filter -> output
    this.inputGain.connect(this.filterNode);
    this.filterNode.connect(this.outputGain);
  }

  // AudioComponent interface implementation

  public connect(destination: AudioNode | AudioComponent): void {
    if ('getInputNode' in destination) {
      this.outputGain.connect(destination.getInputNode());
    } else {
      this.outputGain.connect(destination);
    }
  }

  public disconnect(): void {
    this.outputGain.disconnect();
  }

  public setParameter(name: string, value: number): void {
    const now = this.engine.getCurrentTime();
    
    switch (name) {
      case 'frequency':
      case 'cutoff':
        // Clamp to valid range (20 Hz - Nyquist frequency)
        this.frequency = Math.max(20, Math.min(this.engine.getSampleRate() / 2, value));
        this.filterNode.frequency.exponentialRampToValueAtTime(this.frequency, now + 0.01);
        break;
        
      case 'resonance':
      case 'Q':
        // Clamp Q value (0.0001 - 1000)
        this.resonance = Math.max(0.0001, Math.min(1000, value));
        this.filterNode.Q.linearRampToValueAtTime(this.resonance, now + 0.01);
        break;
        
      case 'gain':
        // For peaking and shelving filters (-40 to +40 dB)
        this.gain = Math.max(-40, Math.min(40, value));
        this.filterNode.gain.linearRampToValueAtTime(this.gain, now + 0.01);
        break;
        
      default:
        console.warn(`Unknown parameter: ${name}`);
    }
  }

  public getParameter(name: string): number {
    switch (name) {
      case 'frequency':
      case 'cutoff':
        return this.frequency;
      case 'resonance':
      case 'Q':
        return this.resonance;
      case 'gain':
        return this.gain;
      default:
        return 0;
    }
  }

  public enable(): void {
    this.enabled = true;
    // Reconnect the filter
    this.inputGain.disconnect();
    this.inputGain.connect(this.filterNode);
  }

  public disable(): void {
    this.enabled = false;
    // Bypass: connect input directly to output
    this.inputGain.disconnect();
    this.inputGain.connect(this.outputGain);
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getName(): string {
    return this.name;
  }

  public getType(): string {
    return `Filter-${this.filterType}`;
  }

  public getParameters(): ParameterDescriptor[] {
    const params: ParameterDescriptor[] = [
      {
        name: 'frequency',
        min: 20,
        max: this.engine.getSampleRate() / 2,
        default: 1000,
        unit: 'Hz',
        type: 'continuous',
      },
      {
        name: 'resonance',
        min: 0.0001,
        max: 30,
        default: 1,
        unit: 'Q',
        type: 'continuous',
      },
    ];

    // Add gain parameter for peaking, lowshelf, and highshelf filters
    if (['peaking', 'lowshelf', 'highshelf'].includes(this.filterType)) {
      params.push({
        name: 'gain',
        min: -40,
        max: 40,
        default: 0,
        unit: 'dB',
        type: 'continuous',
      });
    }

    return params;
  }

  public getInputNode(): AudioNode {
    return this.inputGain;
  }

  public getOutputNode(): AudioNode {
    return this.outputGain;
  }

  /**
   * Get the frequency response of the filter
   * Useful for visualization
   */
  public getFrequencyResponse(frequencyArray: Float32Array): { magnitude: Float32Array; phase: Float32Array } {
    const magResponse = new Float32Array(frequencyArray.length);
    const phaseResponse = new Float32Array(frequencyArray.length);
    
    // Type assertion needed due to TypeScript's strict Float32Array generic handling
    this.filterNode.getFrequencyResponse(
      frequencyArray as Float32Array<ArrayBuffer>,
      magResponse as Float32Array<ArrayBuffer>,
      phaseResponse as Float32Array<ArrayBuffer>
    );
    
    return {
      magnitude: magResponse,
      phase: phaseResponse,
    };
  }

  /**
   * Set resonance using a normalized value (0-1)
   * Easier for UI controls
   */
  public setResonanceNormalized(value: number): void {
    // Map 0-1 to 0.0001-30 (exponential scaling for more control)
    const normalized = Math.max(0, Math.min(1, value));
    const q = 0.0001 + Math.pow(normalized, 2) * 30;
    this.setParameter('resonance', q);
  }

  /**
   * Get resonance as normalized value (0-1)
   */
  public getResonanceNormalized(): number {
    return Math.sqrt((this.resonance - 0.0001) / 30);
  }
}
