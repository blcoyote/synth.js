/**
 * BusManager - Manages multiple audio buses
 * 
 * Provides centralized management of all audio buses in the system,
 * including the master bus and auxiliary buses.
 */

import { AudioBus } from './AudioBus';
import { AudioEngine } from '../core/AudioEngine';
import type { BusConfig, BusType } from '../core/types';

export class BusManager {
  private static instance: BusManager | null = null;
  private buses: Map<string, AudioBus>;
  private masterBus: AudioBus | null = null;
  private engine: AudioEngine;

  private constructor() {
    this.buses = new Map();
    this.engine = AudioEngine.getInstance();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): BusManager {
    if (!BusManager.instance) {
      BusManager.instance = new BusManager();
    }
    return BusManager.instance;
  }

  /**
   * Initialize the bus manager with a master bus
   */
  public initialize(): void {
    if (this.masterBus) {
      console.warn('BusManager already initialized');
      return;
    }

    // Create master bus
    this.masterBus = this.createBus({
      name: 'Master',
      type: 'master',
      gain: 0.8, // Start at 80% to avoid clipping
    });

    // Connect master bus to speakers
    this.masterBus.connect(this.engine.getDestination());

    console.log('BusManager initialized with Master bus');
  }

  /**
   * Create a new audio bus
   */
  public createBus(config: BusConfig): AudioBus {
    if (this.buses.has(config.name)) {
      throw new Error(`Bus with name "${config.name}" already exists`);
    }

    const bus = new AudioBus(config);
    this.buses.set(config.name, bus);

    // If not master bus, auto-connect to master
    if (config.type !== 'master' && this.masterBus) {
      bus.connect(this.masterBus);
    }

    return bus;
  }

  /**
   * Get a bus by name
   */
  public getBus(name: string): AudioBus | undefined {
    return this.buses.get(name);
  }

  /**
   * Get the master bus
   */
  public getMasterBus(): AudioBus {
    if (!this.masterBus) {
      throw new Error('BusManager not initialized. Call initialize() first.');
    }
    return this.masterBus;
  }

  /**
   * Get all buses of a specific type
   */
  public getBusesByType(type: BusType): AudioBus[] {
    return Array.from(this.buses.values()).filter(bus => bus.getType() === type);
  }

  /**
   * Get all bus names
   */
  public getBusNames(): string[] {
    return Array.from(this.buses.keys());
  }

  /**
   * Remove a bus (cannot remove master bus)
   */
  public removeBus(name: string): boolean {
    if (name === 'Master') {
      console.error('Cannot remove Master bus');
      return false;
    }

    const bus = this.buses.get(name);
    if (!bus) {
      console.warn(`Bus "${name}" not found`);
      return false;
    }

    bus.disconnect();
    bus.clearEffects();
    this.buses.delete(name);

    console.log(`Bus removed: ${name}`);
    return true;
  }

  /**
   * Set master volume
   */
  public setMasterVolume(value: number): void {
    if (this.masterBus) {
      this.masterBus.setOutputGain(value);
    }
  }

  /**
   * Get master volume
   */
  public getMasterVolume(): number {
    return this.masterBus?.getOutputGain() || 0;
  }

  /**
   * Mute/unmute master bus
   */
  public setMasterMute(mute: boolean): void {
    if (this.masterBus) {
      this.masterBus.setOutputGain(mute ? 0 : 0.8, 0.05);
    }
  }

  /**
   * Get debug info for all buses
   */
  public getDebugInfo(): object {
    return {
      totalBuses: this.buses.size,
      buses: Array.from(this.buses.values()).map(bus => bus.getDebugInfo()),
    };
  }

  /**
   * Reset the bus manager
   */
  public reset(): void {
    // Disconnect and clear all buses except master
    this.buses.forEach((bus, name) => {
      if (name !== 'Master') {
        bus.disconnect();
        bus.clearEffects();
      }
    });

    // Clear master effects
    if (this.masterBus) {
      this.masterBus.clearEffects();
    }

    // Keep only master bus
    this.buses.clear();
    if (this.masterBus) {
      this.buses.set('Master', this.masterBus);
    }

    console.log('BusManager reset');
  }

  /**
   * Cleanup and destroy the bus manager
   */
  public destroy(): void {
    this.buses.forEach(bus => {
      bus.disconnect();
      bus.clearEffects();
    });

    this.buses.clear();
    this.masterBus = null;
    BusManager.instance = null;

    console.log('BusManager destroyed');
  }
}
