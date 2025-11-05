/**
 * EffectsChain - Manages a chain of audio effects
 * 
 * Features:
 * - Add/remove effects dynamically
 * - Reorder effects in the chain
 * - Bypass individual effects or entire chain
 * - Automatic connection management
 * - Clean signal routing
 */

import type { AudioEffect } from '../core/types';
import { AudioEngine } from '../core/AudioEngine';

export interface EffectSlot {
  id: string;
  effect: AudioEffect;
  bypassed: boolean;
}

export interface EffectsChainConfig {
  inputNode?: GainNode;
  outputNode?: GainNode;
}

export class EffectsChain {
  private effects: EffectSlot[] = [];
  private inputNode: GainNode;
  private outputNode: GainNode;
  private chainBypassed: boolean = false;
  private nextId: number = 0;

  constructor(config: EffectsChainConfig = {}) {
    // Use provided nodes or create new ones
    if (config.inputNode && config.outputNode) {
      this.inputNode = config.inputNode;
      this.outputNode = config.outputNode;
    } else {
      // Fallback to AudioEngine if no nodes provided (production use)
      const engine = AudioEngine.getInstance();
      this.inputNode = engine.createGain(1.0);
      this.outputNode = engine.createGain(1.0);
    }
    
    // Initially connect input directly to output (no effects)
    this.inputNode.connect(this.outputNode);
  }

  /**
   * Get input node for connecting audio source
   */
  getInput(): AudioNode {
    return this.inputNode;
  }

  /**
   * Get output node for connecting to destination
   */
  getOutput(): AudioNode {
    return this.outputNode;
  }

  /**
   * Add an effect to the end of the chain
   */
  addEffect(effect: AudioEffect): string {
    const id = `effect-${this.nextId++}`;
    const slot: EffectSlot = {
      id,
      effect,
      bypassed: false
    };
    
    this.effects.push(slot);
    this.reconnectChain();
    
    return id;
  }

  /**
   * Remove an effect by ID
   */
  removeEffect(id: string): boolean {
    const index = this.effects.findIndex(slot => slot.id === id);
    if (index === -1) return false;
    
    const slot = this.effects[index];
    
    // Disconnect the effect
    slot.effect.disconnect();
    
    // Remove from array
    this.effects.splice(index, 1);
    
    // Reconnect remaining effects
    this.reconnectChain();
    
    return true;
  }

  /**
   * Move an effect to a different position
   */
  moveEffect(id: string, newPosition: number): boolean {
    const currentIndex = this.effects.findIndex(slot => slot.id === id);
    if (currentIndex === -1) return false;
    
    // Clamp position
    newPosition = Math.max(0, Math.min(newPosition, this.effects.length - 1));
    
    if (currentIndex === newPosition) return true;
    
    // Remove from current position
    const [slot] = this.effects.splice(currentIndex, 1);
    
    // Insert at new position
    this.effects.splice(newPosition, 0, slot);
    
    // Reconnect chain
    this.reconnectChain();
    
    return true;
  }

  /**
   * Bypass a specific effect
   */
  bypassEffect(id: string, bypass: boolean): boolean {
    const slot = this.effects.find(s => s.id === id);
    if (!slot) return false;
    
    slot.bypassed = bypass;
    slot.effect.bypass(bypass);
    
    return true;
  }

  /**
   * Bypass entire chain
   */
  bypassChain(bypass: boolean): void {
    this.chainBypassed = bypass;
    this.reconnectChain();
  }

  /**
   * Check if chain is bypassed
   */
  isChainBypassed(): boolean {
    return this.chainBypassed;
  }

  /**
   * Get all effects in order
   */
  getEffects(): ReadonlyArray<EffectSlot> {
    return this.effects;
  }

  /**
   * Get effect by ID
   */
  getEffect(id: string): AudioEffect | null {
    const slot = this.effects.find(s => s.id === id);
    return slot ? slot.effect : null;
  }

  /**
   * Clear all effects
   */
  clear(): void {
    // Disconnect all effects
    this.effects.forEach(slot => {
      slot.effect.disconnect();
    });
    
    this.effects = [];
    this.reconnectChain();
  }

  /**
   * Get number of effects in chain
   */
  getEffectCount(): number {
    return this.effects.length;
  }

  /**
   * Reconnect all effects in the chain
   */
  private reconnectChain(): void {
    // Disconnect everything first
    this.inputNode.disconnect();
    this.effects.forEach(slot => {
      slot.effect.disconnect();
    });

    if (this.chainBypassed || this.effects.length === 0) {
      // Bypass: connect input directly to output
      this.inputNode.connect(this.outputNode);
    } else {
      // Connect through effects chain
      let currentSource: AudioNode = this.inputNode;
      
      for (const slot of this.effects) {
        // Connect current source to effect input
        currentSource.connect(slot.effect.getInputNode());
        
        // Next source is this effect's output
        currentSource = slot.effect.getOutputNode();
      }
      
      // Connect last effect to output
      currentSource.connect(this.outputNode);
    }
  }

  /**
   * Cleanup
   */
  disconnect(): void {
    this.clear();
    this.inputNode.disconnect();
    this.outputNode.disconnect();
  }
}
