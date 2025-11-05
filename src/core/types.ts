/**
 * Core type definitions for the modular synthesizer
 */

/**
 * Parameter descriptor for audio components
 */
export interface ParameterDescriptor {
  name: string;
  min: number;
  max: number;
  default: number;
  unit?: string;
  type: 'continuous' | 'discrete' | 'boolean';
}

/**
 * Base interface that all audio components must implement
 */
export interface AudioComponent {
  // Core functionality
  connect(destination: AudioNode | AudioComponent): void;
  disconnect(): void;
  
  // Parameter control
  setParameter(name: string, value: number): void;
  getParameter(name: string): number;
  
  // State management
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  
  // Metadata
  getName(): string;
  getType(): string;
  getParameters(): ParameterDescriptor[];
  
  // Internal audio node access
  getInputNode(): AudioNode;
  getOutputNode(): AudioNode;
}

/**
 * Effect-specific interface
 */
export interface AudioEffect extends AudioComponent {
  // Bypass control
  bypass(shouldBypass: boolean): void;
  isBypassed(): boolean;
  
  // Wet/dry mix (0-1)
  setMix(value: number): void;
  getMix(): number;
}

/**
 * Bus type definitions
 */
export type BusType = 'master' | 'aux' | 'group';

/**
 * Effect position in the chain
 */
export interface EffectPosition {
  effectId: string;
  position: number;
}

/**
 * Audio context configuration
 */
export interface AudioContextConfig {
  sampleRate?: number;
  latencyHint?: AudioContextLatencyCategory;
}

/**
 * Bus configuration
 */
export interface BusConfig {
  name: string;
  type: BusType;
  gain?: number;
}
