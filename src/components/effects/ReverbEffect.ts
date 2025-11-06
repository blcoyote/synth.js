/**
 * ReverbEffect - Enhanced reverb with professional parameters
 * 
 * Creates a sense of space and ambience using a network of
 * delays (Schroeder reverb algorithm).
 * 
 * Classic use: Room ambience, hall spaces, plate reverb simulation,
 * ambient pads, vocal depth
 * 
 * Parameters:
 * - decay: How long the reverb lasts (0-1)
 * - predelay: Delay before reverb starts (0-100ms)
 * - damping: High frequency absorption (500-8000Hz)
 * - spread: Stereo width of reverb (0-1)
 * - size: Room size feeling (0-1, affects delay times)
 * - mix: Wet/dry balance
 * 
 * Note: This is an enhanced educational reverb. Production reverbs use
 * convolution or even more complex algorithms.
 */

import { BaseEffect } from './BaseEffect';
import type { ParameterDescriptor } from '../../core/types';

export class ReverbEffect extends BaseEffect {
  private delays: DelayNode[] = [];
  private feedbacks: GainNode[] = [];
  private filters: BiquadFilterNode[] = [];
  private decayGain: GainNode;
  private preDelayNode: DelayNode;
  private spreadLeft: GainNode;
  private spreadRight: GainNode;
  private spreadMerger: ChannelMergerNode;
  private spreadSplitter: ChannelSplitterNode;
  private smoothingFilter: BiquadFilterNode;
  private wetBoost: GainNode;
  
  private decay: number = 0.5;
  private predelay: number = 0.03; // 30ms default
  private damping: number = 2000; // 2kHz default
  private spread: number = 0.7; // 70% stereo width
  private size: number = 0.5; // Medium room
  private averageDelayTime: number = 0.04; // Average comb filter delay time in seconds

  constructor(decay: number = 0.5) {
    super('Reverb Effect', 'reverb');
    
    this.decay = Math.max(0, Math.min(1, decay));
    
    // Pre-delay for initial reflection (adds depth and realism)
    this.preDelayNode = this.engine.createDelay(0.1);
    this.preDelayNode.delayTime.value = this.predelay;
    
    // Stereo spread using channel splitter/merger
    const context = this.engine.getContext();
    this.spreadSplitter = context.createChannelSplitter(2);
    this.spreadMerger = context.createChannelMerger(2);
    this.spreadLeft = this.engine.createGain(1.0);
    this.spreadRight = this.engine.createGain(1.0);
    
    // Create decay control
    this.decayGain = this.engine.createGain(1.0);
    
    // Schroeder reverb: parallel comb filters with feedback
    // Using prime number delays scaled by size parameter
    const baseCombTimes = [0.0297, 0.0371, 0.0411, 0.0437, 0.0503, 0.0571];
    const combDelayTimes = baseCombTimes.map(t => t * (0.5 + this.size * 1.5));
    
    this.inputGain.connect(this.preDelayNode);
    
    // Parallel comb filters with feedback (creates the reverb tail)
    for (let i = 0; i < combDelayTimes.length; i++) {
      const delay = this.engine.createDelay(0.3);
      const feedbackGain = this.engine.createGain(this.decay * 0.7);
      const damping = this.engine.createBiquadFilter('lowpass');
      damping.frequency.value = this.damping;
      const outputGain = this.engine.createGain(0.4 / combDelayTimes.length);
      
      delay.delayTime.value = combDelayTimes[i];
      
      // Comb filter with damping: input -> delay -> damping -> feedback -> delay
      this.preDelayNode.connect(delay);
      delay.connect(damping);
      damping.connect(feedbackGain);
      feedbackGain.connect(delay); // Feedback connection
      damping.connect(outputGain); // Take output after damping
      outputGain.connect(this.decayGain);
      
      this.delays.push(delay);
      this.feedbacks.push(feedbackGain);
      this.filters.push(damping);
    }
    
    // Series all-pass filters for diffusion (creates density)
    const baseAllpassTimes = [0.005, 0.0089, 0.0127, 0.0179, 0.0223, 0.0289];
    const allpassDelayTimes = baseAllpassTimes.map(t => t * (0.5 + this.size * 1.5));
    let lastNode: AudioNode = this.decayGain;
    
    for (let i = 0; i < allpassDelayTimes.length; i++) {
      const delay = this.engine.createDelay(0.1);
      const feedbackGain = this.engine.createGain(0.5);
      const feedforwardGain = this.engine.createGain(1.0);
      const inverterGain = this.engine.createGain(-0.5);
      const mixer = this.engine.createGain(1.0);
      
      delay.delayTime.value = allpassDelayTimes[i];
      
      // All-pass filter structure
      lastNode.connect(delay);
      lastNode.connect(feedforwardGain);
      delay.connect(feedbackGain);
      feedbackGain.connect(delay); // Feedback
      delay.connect(inverterGain);
      
      feedforwardGain.connect(mixer);
      inverterGain.connect(mixer);
      
      lastNode = mixer;
      this.delays.push(delay);
      this.feedbacks.push(feedbackGain);
    }
    
    // Stereo spread processing
    lastNode.connect(this.spreadSplitter);
    
    // Left channel: slightly delayed
    this.spreadSplitter.connect(this.spreadLeft, 0);
    const leftDelay = this.engine.createDelay(0.01);
    leftDelay.delayTime.value = 0.003 * this.spread; // 3ms max
    this.spreadLeft.connect(leftDelay);
    leftDelay.connect(this.spreadMerger, 0, 0);
    
    // Right channel: slightly delayed opposite
    this.spreadSplitter.connect(this.spreadRight, 1);
    const rightDelay = this.engine.createDelay(0.01);
    rightDelay.delayTime.value = 0.002 * this.spread; // 2ms max, different timing
    this.spreadRight.connect(rightDelay);
    rightDelay.connect(this.spreadMerger, 0, 1);
    
    // Smoothing filter and boost
    this.wetBoost = this.engine.createGain(1.5);
    this.smoothingFilter = this.engine.createBiquadFilter('lowpass');
    this.smoothingFilter.frequency.value = 6000;
    this.smoothingFilter.Q.value = 0.7;
    
    this.spreadMerger.connect(this.wetBoost);
    this.wetBoost.connect(this.smoothingFilter);
    
    // Connect to wet path
    this.connectWetPath(this.smoothingFilter);
    
    // Calculate average delay time for RT60 conversion
    this.averageDelayTime = combDelayTimes.reduce((a, b) => a + b, 0) / combDelayTimes.length;
    
    // Set initial mix to 70% - obvious effect
    this.setMix(0.7);
  }

  /**
   * Convert decay feedback (0-1) to RT60 time in seconds
   * RT60 is the time for reverb to decay by 60dB
   * Formula: RT60 ≈ -3 * delayTime / ln(feedback)
   */
  private decayToRT60(decay: number): number {
    if (decay <= 0.01) return 0;
    const feedback = decay * 0.7; // Match the comb filter feedback calculation
    // Using average delay time and logarithmic decay formula
    const rt60 = -3 * this.averageDelayTime / Math.log(feedback);
    return Math.max(0, rt60);
  }

  /**
   * Convert RT60 time in seconds to decay feedback (0-1)
   * Inverse of decayToRT60
   */
  private rt60ToDecay(rt60Seconds: number): number {
    if (rt60Seconds <= 0) return 0;
    // Solve for feedback: RT60 = -3 * delayTime / ln(feedback)
    // ln(feedback) = -3 * delayTime / RT60
    // feedback = exp(-3 * delayTime / RT60)
    const feedback = Math.exp(-3 * this.averageDelayTime / rt60Seconds);
    // Convert feedback back to decay (0-1)
    const decay = feedback / 0.7;
    return Math.max(0, Math.min(1, decay));
  }

  public setParameter(name: string, value: number): void {
    const now = this.engine.getCurrentTime();
    
    switch (name) {
      case 'decay':
      case 'time': {
        this.decay = Math.max(0, Math.min(1, value));
        // Adjust feedback gains for each comb filter (controls reverb tail length)
        // First 6 are comb filters (moderate feedback), rest are all-pass (low feedback)
        this.feedbacks.forEach((feedback, index) => {
          const feedbackAmount = index < 6 
            ? this.decay * 0.7   // Comb filters: moderate feedback to avoid metallic sound
            : 0.5;               // All-pass filters: low feedback for smooth diffusion
          feedback.gain.linearRampToValueAtTime(feedbackAmount, now + 0.01);
        });
        break;
      }
      
      case 'rt60': {
        // RT60 in seconds (typical range 0.1 to 10 seconds)
        // Convert RT60 to decay feedback and apply
        this.decay = this.rt60ToDecay(value);
        this.feedbacks.forEach((feedback, index) => {
          const feedbackAmount = index < 6 
            ? this.decay * 0.7
            : 0.5;
          feedback.gain.linearRampToValueAtTime(feedbackAmount, now + 0.01);
        });
        break;
      }
      
      case 'predelay': {
        // Pre-delay in milliseconds (0-100ms)
        this.predelay = Math.max(0, Math.min(0.1, value / 1000));
        this.preDelayNode.delayTime.linearRampToValueAtTime(this.predelay, now + 0.01);
        break;
      }
      
      case 'damping': {
        // Damping frequency in Hz (500-8000Hz)
        this.damping = Math.max(500, Math.min(8000, value));
        // Update all comb filter dampings (first 6 filters)
        for (let i = 0; i < 6; i++) {
          this.filters[i].frequency.linearRampToValueAtTime(this.damping, now + 0.01);
        }
        break;
      }
      
      case 'spread': {
        // Stereo spread (0-1)
        this.spread = Math.max(0, Math.min(1, value));
        // Can't easily update delay times dynamically, but we can adjust gains
        const spreadGain = 0.5 + this.spread * 0.5; // 0.5 to 1.0
        this.spreadLeft.gain.linearRampToValueAtTime(spreadGain, now + 0.01);
        this.spreadRight.gain.linearRampToValueAtTime(spreadGain, now + 0.01);
        break;
      }
      
      case 'size': {
        // Room size (0-1) - affects delay times
        // Note: Can't dynamically change delay times without reconstruction
        // So we store it for display but warn about limitations
        this.size = Math.max(0, Math.min(1, value));
        console.warn('Size parameter change requires reverb restart to take full effect');
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
      case 'decay':
      case 'time':
        return this.decay;
      case 'rt60':
        return this.decayToRT60(this.decay);
      case 'predelay':
        return this.predelay * 1000; // Return in milliseconds
      case 'damping':
        return this.damping;
      case 'spread':
        return this.spread;
      case 'size':
        return this.size;
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
        name: 'decay',
        min: 0,
        max: 1,
        default: 0.5,
        unit: 'ratio',
        type: 'continuous',
      },
      {
        name: 'rt60',
        min: 0.1,
        max: 10,
        default: 0.8,
        unit: 's',
        type: 'continuous',
      },
      {
        name: 'predelay',
        min: 0,
        max: 100,
        default: 30,
        unit: 'ms',
        type: 'continuous',
      },
      {
        name: 'damping',
        min: 500,
        max: 8000,
        default: 2000,
        unit: 'Hz',
        type: 'continuous',
      },
      {
        name: 'spread',
        min: 0,
        max: 1,
        default: 0.7,
        unit: 'ratio',
        type: 'continuous',
      },
      {
        name: 'size',
        min: 0,
        max: 1,
        default: 0.5,
        unit: 'ratio',
        type: 'continuous',
      },
    ];
  }
}
