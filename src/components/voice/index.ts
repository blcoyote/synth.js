/**
 * Voice Components
 * 
 * Provides high-level abstractions for managing synthesizer voices:
 * - VoiceChannel: Single oscillator with envelope and effects
 * - Voice: Collection of VoiceChannels for multi-oscillator patches
 */

export { VoiceChannel } from './VoiceChannel';
export type { VoiceChannelConfig, VoiceChannelState } from './VoiceChannel';

export { Voice } from './Voice';
export type { VoiceConfig } from './Voice';
