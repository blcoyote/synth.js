/**
 * DistortionEffect - Waveshaping distortion/overdrive
 * 
 * Adds harmonic content and grit by clipping the waveform.
 * Uses a waveshaper with different curve types.
 * 
 * Classic use: Guitar-like overdrive, aggressive synth leads,
 * bass saturation, adding harmonics
 * 
 * Parameters:
 * - drive: Amount of distortion (0-1)
 * - tone: Post-distortion filtering (0-1, dark to bright)
 * - mix: Wet/dry balance
 */

import { BaseEffect } from './BaseEffect';
import type { ParameterDescriptor } from '../../core/types';

export class DistortionEffect extends BaseEffect {
  private waveshaper: WaveShaperNode;
  private preGain: GainNode;
  private postGain: GainNode;
  private toneFilter: BiquadFilterNode;
  
  private drive: number = 0.5;
  private tone: number = 0.5;

  constructor(drive: number = 0.5) {
    super('Distortion Effect', 'distortion');
    
    this.drive = drive;
    
    // Create processing nodes
    this.preGain = this.engine.createGain(1.0);
    this.waveshaper = this.engine.getContext().createWaveShaper();
    this.postGain = this.engine.createGain(1.0);
    this.toneFilter = this.engine.createBiquadFilter('lowpass');
    
    // Set tone filter
    this.toneFilter.frequency.value = 3000;
    this.toneFilter.Q.value = 1;
    
    // Connect: input -> pre gain -> waveshaper -> post gain -> tone filter
    this.inputGain.connect(this.preGain);
    this.preGain.connect(this.waveshaper);
    this.waveshaper.connect(this.postGain);
    this.postGain.connect(this.toneFilter);
    
    // Connect to wet path
    this.connectWetPath(this.toneFilter);
    
    // Set initial drive
    this.updateDistortionCurve();
    
    // Set initial mix to 80% (typical for distortion)
    this.setMix(0.8);
  }

  private updateDistortionCurve(): void {
    const samples = 256;
    const curve = new Float32Array(samples);
    const amount = this.drive * 100; // Scale drive amount
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; // -1 to 1
      
      // Soft clipping curve (smooth saturation)
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    
    this.waveshaper.curve = curve;
    this.waveshaper.oversample = '4x'; // Better quality
  }

  public setParameter(name: string, value: number): void {
    const now = this.engine.getCurrentTime();
    
    switch (name) {
      case 'drive':
      case 'amount': {
        this.drive = Math.max(0, Math.min(1, value));
        this.updateDistortionCurve();
        
        // Adjust post-gain to compensate for increased level
        const compensation = 1.0 / (1.0 + this.drive * 2);
        this.postGain.gain.linearRampToValueAtTime(compensation, now + 0.01);
        break;
      }
        
      case 'tone': {
        this.tone = Math.max(0, Math.min(1, value));
        // Map tone to filter frequency (500 Hz - 8000 Hz)
        const freq = 500 + this.tone * 7500;
        this.toneFilter.frequency.exponentialRampToValueAtTime(freq, now + 0.01);
        break;
      }
        
      case 'mix':
        this.setMix(value);
        break;
        
      default:
        console.warn(`Unknown parameter: ${name}`);
    }
  }

  public getParameter(name: string): number {
    switch (name) {
      case 'drive':
      case 'amount':
        return this.drive;
      case 'tone':
        return this.tone;
      case 'mix':
        return this.mix;
      default:
        return 0;
    }
  }

  public getParameters(): ParameterDescriptor[] {
    return [
      ...this.getCommonParameters(),
      {
        name: 'drive',
        min: 0,
        max: 1,
        default: 0.5,
        unit: 'ratio',
        type: 'continuous',
      },
      {
        name: 'tone',
        min: 0,
        max: 1,
        default: 0.5,
        unit: 'ratio',
        type: 'continuous',
      },
    ];
  }
}
