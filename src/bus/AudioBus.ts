/**
 * AudioBus - Signal routing and effect chain management
 * 
 * Manages audio signal flow with support for:
 * - Dynamic effect insertion/removal
 * - Effect reordering
 * - Effect bypass
 * - Gain control
 */

import type { AudioEffect, BusConfig, BusType } from '../core/types';
import { AudioEngine } from '../core/AudioEngine';

export class AudioBus {
  private name: string;
  private type: BusType;
  private inputNode: GainNode;
  private outputNode: GainNode;
  private effects: Map<string, AudioEffect>;
  private effectOrder: string[];
  private engine: AudioEngine;
  private isConnected: boolean = false;

  constructor(config: BusConfig) {
    this.name = config.name;
    this.type = config.type;
    this.engine = AudioEngine.getInstance();
    this.effects = new Map();
    this.effectOrder = [];

    // Create input and output gain nodes
    this.inputNode = this.engine.createGain(config.gain || 1.0);
    this.outputNode = this.engine.createGain(1.0);

    // Initially connect input directly to output (no effects)
    this._reconnectChain();

    console.log(`AudioBus created: ${this.name} (${this.type})`);
  }

  /**
   * Get the bus name
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Get the bus type
   */
  public getType(): BusType {
    return this.type;
  }

  /**
   * Get the input node for connecting sources
   */
  public getInputNode(): GainNode {
    return this.inputNode;
  }

  /**
   * Get the output node for connecting to destination
   */
  public getOutputNode(): GainNode {
    return this.outputNode;
  }

  /**
   * Set the input gain
   */
  public setInputGain(value: number, rampTime: number = 0.01): void {
    const now = this.engine.getCurrentTime();
    this.inputNode.gain.linearRampToValueAtTime(value, now + rampTime);
  }

  /**
   * Get the current input gain
   */
  public getInputGain(): number {
    return this.inputNode.gain.value;
  }

  /**
   * Set the output gain
   */
  public setOutputGain(value: number, rampTime: number = 0.01): void {
    const now = this.engine.getCurrentTime();
    this.outputNode.gain.linearRampToValueAtTime(value, now + rampTime);
  }

  /**
   * Get the current output gain
   */
  public getOutputGain(): number {
    return this.outputNode.gain.value;
  }

  /**
   * Add an effect to the bus
   * @param effect The effect to add
   * @param position Optional position in the chain (default: end)
   * @returns The unique effect ID assigned by the bus
   */
  public addEffect(effect: AudioEffect, position?: number): string {
    const effectId = `${effect.getName()}_${Date.now()}`;
    
    if (this.effects.has(effectId)) {
      throw new Error(`Effect with ID ${effectId} already exists`);
    }

    this.effects.set(effectId, effect);

    // Insert at specified position or append to end
    if (position !== undefined && position >= 0 && position <= this.effectOrder.length) {
      this.effectOrder.splice(position, 0, effectId);
    } else {
      this.effectOrder.push(effectId);
    }

    // Reconnect the entire chain
    this._reconnectChain();

    console.log(`Effect added to ${this.name}: ${effect.getName()} at position ${position || this.effectOrder.length - 1}`);
    return effectId;
  }

  /**
   * Remove an effect from the bus
   */
  public removeEffect(effectId: string): boolean {
    if (!this.effects.has(effectId)) {
      console.warn(`Effect ${effectId} not found in bus ${this.name}`);
      return false;
    }

    const effect = this.effects.get(effectId)!;
    effect.disconnect();
    this.effects.delete(effectId);

    const index = this.effectOrder.indexOf(effectId);
    if (index > -1) {
      this.effectOrder.splice(index, 1);
    }

    // Reconnect the chain without this effect
    this._reconnectChain();

    console.log(`Effect removed from ${this.name}: ${effect.getName()}`);
    return true;
  }

  /**
   * Move an effect to a new position in the chain
   */
  public moveEffect(effectId: string, newPosition: number): boolean {
    const currentIndex = this.effectOrder.indexOf(effectId);
    
    if (currentIndex === -1) {
      console.warn(`Effect ${effectId} not found in bus ${this.name}`);
      return false;
    }

    if (newPosition < 0 || newPosition >= this.effectOrder.length) {
      console.warn(`Invalid position ${newPosition}`);
      return false;
    }

    // Remove from current position
    this.effectOrder.splice(currentIndex, 1);
    
    // Insert at new position
    this.effectOrder.splice(newPosition, 0, effectId);

    // Reconnect the chain
    this._reconnectChain();

    console.log(`Effect moved in ${this.name}: ${effectId} to position ${newPosition}`);
    return true;
  }

  /**
   * Bypass an effect (audio passes through unchanged)
   */
  public bypassEffect(effectId: string, bypass: boolean): boolean {
    const effect = this.effects.get(effectId);
    
    if (!effect) {
      console.warn(`Effect ${effectId} not found in bus ${this.name}`);
      return false;
    }

    effect.bypass(bypass);
    console.log(`Effect ${effect.getName()} bypass: ${bypass}`);
    return true;
  }

  /**
   * Get all effects in the bus
   */
  public getEffects(): AudioEffect[] {
    return this.effectOrder.map(id => this.effects.get(id)!);
  }

  /**
   * Get effect by ID
   */
  public getEffect(effectId: string): AudioEffect | undefined {
    return this.effects.get(effectId);
  }

  /**
   * Clear all effects from the bus
   */
  public clearEffects(): void {
    this.effectOrder.forEach(id => {
      const effect = this.effects.get(id)!;
      effect.disconnect();
    });

    this.effects.clear();
    this.effectOrder = [];
    this._reconnectChain();

    console.log(`All effects cleared from ${this.name}`);
  }

  /**
   * Connect this bus to a destination
   */
  public connect(destination: AudioNode | AudioBus): void {
    if (destination instanceof AudioBus) {
      this.outputNode.connect(destination.getInputNode());
    } else {
      this.outputNode.connect(destination);
    }
    this.isConnected = true;
  }

  /**
   * Disconnect this bus from all destinations
   */
  public disconnect(): void {
    this.outputNode.disconnect();
    this.isConnected = false;
  }

  /**
   * Internal method to reconnect the effect chain
   * Called whenever effects are added, removed, or reordered
   */
  private _reconnectChain(): void {
    // Disconnect everything first
    this.inputNode.disconnect();
    this.effectOrder.forEach(id => {
      const effect = this.effects.get(id)!;
      effect.disconnect();
    });

    // If no effects, connect input directly to output
    if (this.effectOrder.length === 0) {
      this.inputNode.connect(this.outputNode);
      return;
    }

    // Connect input to first effect
    const firstEffect = this.effects.get(this.effectOrder[0])!;
    this.inputNode.connect(firstEffect.getInputNode());

    // Connect effects in series
    for (let i = 0; i < this.effectOrder.length - 1; i++) {
      const currentEffect = this.effects.get(this.effectOrder[i])!;
      const nextEffect = this.effects.get(this.effectOrder[i + 1])!;
      currentEffect.getOutputNode().connect(nextEffect.getInputNode());
    }

    // Connect last effect to output
    const lastEffect = this.effects.get(this.effectOrder[this.effectOrder.length - 1])!;
    lastEffect.getOutputNode().connect(this.outputNode);
  }

  /**
   * Get debug info about the bus
   */
  public getDebugInfo(): object {
    return {
      name: this.name,
      type: this.type,
      inputGain: this.inputNode.gain.value,
      outputGain: this.outputNode.gain.value,
      effectCount: this.effects.size,
      effectChain: this.effectOrder.map(id => {
        const effect = this.effects.get(id)!;
        return {
          id,
          name: effect.getName(),
          type: effect.getType(),
          bypassed: effect.isBypassed(),
        };
      }),
      isConnected: this.isConnected,
    };
  }
}
