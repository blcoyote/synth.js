/**
 * Voice - Manages multiple VoiceChannels for a single note
 * 
 * A Voice can contain multiple VoiceChannels (e.g., Oscillator 1 + Oscillator 2)
 * that are all triggered together to create a richer sound.
 * 
 * This enables:
 * - Multi-oscillator patches (layering)
 * - Unison/detune effects
 * - Complex timbres from simple waveforms
 */

import type { VoiceChannel } from './VoiceChannel';

export interface VoiceConfig {
  noteNumber?: number;
  channels: VoiceChannel[];
}

/**
 * Voice - A complete voice that can contain multiple oscillator channels
 */
export class Voice {
  private channels: VoiceChannel[];
  private noteNumber?: number;
  private _isActive: boolean = false;

  constructor(config: VoiceConfig) {
    this.channels = config.channels;
    this.noteNumber = config.noteNumber;
  }

  /**
   * Connect all channels to a destination
   */
  connect(destination: AudioNode): void {
    this.channels.forEach(channel => channel.connect(destination));
  }

  /**
   * Disconnect all channels
   */
  disconnect(): void {
    this.channels.forEach(channel => channel.disconnect());
  }

  /**
   * Trigger all channels
   */
  trigger(velocity: number = 1.0): void {
    this._isActive = true;
    this.channels.forEach(channel => channel.trigger(velocity));
  }

  /**
   * Release all channels
   */
  release(): void {
    this.channels.forEach(channel => channel.release());
    
    // Check if any channel is still playing after a short delay
    setTimeout(() => {
      const anyPlaying = this.channels.some(ch => ch.isPlaying());
      if (!anyPlaying) {
        this._isActive = false;
      }
    }, 100);
  }

  /**
   * Stop all channels immediately
   */
  stop(): void {
    this.channels.forEach(channel => channel.stop());
    this._isActive = false;
  }

  /**
   * Cleanup and dispose all channels
   */
  dispose(): void {
    this.channels.forEach(channel => channel.dispose());
    this.channels = [];
    this._isActive = false;
  }

  /**
   * Check if voice is active (has playing channels)
   */
  isActive(): boolean {
    return this._isActive || this.channels.some(ch => ch.isPlaying());
  }

  /**
   * Get all channels
   */
  getChannels(): readonly VoiceChannel[] {
    return this.channels;
  }

  /**
   * Get a specific channel by index
   */
  getChannel(index: number): VoiceChannel | undefined {
    return this.channels[index];
  }

  /**
   * Get the note number (MIDI note or index)
   */
  getNoteNumber(): number | undefined {
    return this.noteNumber;
  }

  /**
   * Set frequency for all channels
   */
  setFrequency(frequency: number): void {
    this.channels.forEach(channel => channel.setFrequency(frequency));
  }
}
