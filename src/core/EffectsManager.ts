/**
 * EffectsManager - Manages dynamic effects chain for V2
 * 
 * Responsibilities:
 * - Add/remove effects dynamically
 * - Bypass individual effects or entire chain
 * - Reorder effects in chain
 * - Update effect parameters
 * 
 * @remarks
 * Uses dependency injection - AudioEngine is passed in constructor.
 * Effects are connected serially: input -> effect1 -> effect2 -> ... -> output
 */

import type { AudioEngine } from "./AudioEngine";
import type { BaseEffect } from "../components/effects/BaseEffect";

export interface EffectSlot {
  id: string;
  effect: BaseEffect;
  bypassed: boolean;
}

export class EffectsManager {
  private effects: EffectSlot[] = [];
  private inputNode: GainNode;
  private outputNode: GainNode;
  private chainBypassed: boolean = false;
  private nextId: number = 1;

  constructor(audioEngine: AudioEngine) {
    const context = audioEngine.getContext();
    
    // Create input/output nodes for the effects chain
    this.inputNode = context.createGain();
    this.outputNode = context.createGain();
    
    // Initially connect input directly to output (empty chain)
    this.inputNode.connect(this.outputNode);
  }

  /**
   * Add an effect to the chain
   * @returns Effect ID for later reference
   */
  addEffect(effect: BaseEffect): string {
    const id = `effect_${this.nextId++}`;
    
    this.effects.push({
      id,
      effect,
      bypassed: false,
    });
    
    // Rebuild the audio chain
    this._rebuildChain();
    
    return id;
  }

  /**
   * Remove an effect from the chain
   */
  removeEffect(id: string): boolean {
    const index = this.effects.findIndex(slot => slot.id === id);
    if (index === -1) return false;
    
    // Disconnect the effect
    const slot = this.effects[index];
    slot.effect.disconnect();
    
    // Remove from array
    this.effects.splice(index, 1);
    
    // Rebuild the chain
    this._rebuildChain();
    
    return true;
  }

  /**
   * Bypass or un-bypass an individual effect
   */
  bypassEffect(id: string, bypass: boolean): boolean {
    const slot = this.effects.find(s => s.id === id);
    if (!slot) return false;
    
    slot.bypassed = bypass;
    
    // Rebuild chain to route around bypassed effects
    this._rebuildChain();
    
    return true;
  }

  /**
   * Bypass the entire effects chain
   */
  bypassChain(bypass: boolean): void {
    this.chainBypassed = bypass;
    this._rebuildChain();
  }

  /**
   * Get all effects in the chain
   */
  getEffects(): EffectSlot[] {
    return [...this.effects];
  }

  /**
   * Clear all effects
   */
  clearEffects(): void {
    // Disconnect all effects
    this.effects.forEach(slot => slot.effect.disconnect());
    this.effects = [];
    this._rebuildChain();
  }

  /**
   * Move an effect to a new position
   */
  moveEffect(id: string, newIndex: number): boolean {
    const oldIndex = this.effects.findIndex(slot => slot.id === id);
    if (oldIndex === -1) return false;
    if (newIndex < 0 || newIndex >= this.effects.length) return false;
    
    // Remove from old position
    const [slot] = this.effects.splice(oldIndex, 1);
    
    // Insert at new position
    this.effects.splice(newIndex, 0, slot);
    
    // Rebuild chain
    this._rebuildChain();
    
    return true;
  }

  /**
   * Get input node to connect signal source
   */
  getInputNode(): AudioNode {
    return this.inputNode;
  }

  /**
   * Get output node to connect to destination
   */
  getOutputNode(): AudioNode {
    return this.outputNode;
  }

  /**
   * Check if chain is bypassed
   */
  isChainBypassed(): boolean {
    return this.chainBypassed;
  }

  /**
   * Private: Rebuild the audio chain
   * Disconnects all nodes and reconnects in the correct order
   */
  private _rebuildChain(): void {
    // Disconnect everything
    this.inputNode.disconnect();
    this.effects.forEach(slot => slot.effect.disconnect());
    
    // If chain is bypassed or no effects, connect input directly to output
    if (this.chainBypassed || this.effects.length === 0) {
      this.inputNode.connect(this.outputNode);
      return;
    }
    
    // Build chain with active (non-bypassed) effects
    const activeEffects = this.effects.filter(slot => !slot.bypassed);
    
    if (activeEffects.length === 0) {
      // All effects bypassed, direct connection
      this.inputNode.connect(this.outputNode);
      return;
    }
    
    // Connect input to first active effect
    this.inputNode.connect(activeEffects[0].effect.getInputNode());
    
    // Connect effects in series
    for (let i = 0; i < activeEffects.length - 1; i++) {
      activeEffects[i].effect.getOutputNode().connect(
        activeEffects[i + 1].effect.getInputNode()
      );
    }
    
    // Connect last effect to output
    activeEffects[activeEffects.length - 1].effect.getOutputNode().connect(this.outputNode);
  }
}



