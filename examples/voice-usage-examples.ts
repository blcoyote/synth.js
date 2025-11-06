/**
 * Example: Using VoiceChannel and Voice for cleaner synthesizer code
 * 
 * This example demonstrates how to refactor synth-demo.ts using the new
 * Voice and VoiceChannel abstractions for easier scaling and maintenance.
 */

import { AudioEngine } from '../src/core';
import { BusManager } from '../src/bus';
import { VoiceChannel, Voice } from '../src/components/voice';
import { LFO } from '../src/components/modulation';

// === EXAMPLE 1: Simple Single-Oscillator Voice ===

function example1_SimpleVoice() {
  const engine = AudioEngine.getInstance();
  
  // Create a voice channel with a sine wave at 440Hz (A4)
  const voiceChannel = new VoiceChannel(440, {
    waveform: 'sine',
    volume: 0.7,
    pan: 0, // Center
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.7,
      release: 0.3,
    },
  });

  // Connect to destination
  voiceChannel.connect(engine.getDestination());

  // Play the note
  voiceChannel.trigger(1.0); // velocity = 1.0

  // Release after 1 second
  setTimeout(() => {
    voiceChannel.release();
  }, 1000);

  // Cleanup after release completes
  setTimeout(() => {
    voiceChannel.dispose();
  }, 1500);
}

// === EXAMPLE 2: Multi-Oscillator Voice (Layered) ===

function example2_MultiOscillatorVoice() {
  const engine = AudioEngine.getInstance();
  const busManager = BusManager.getInstance();
  const masterBus = busManager.getMasterBus();

  // Create two voice channels for a richer sound
  const channel1 = new VoiceChannel(440, {
    waveform: 'sawtooth',
    octave: 0,
    detune: -10, // Slight detune for chorus effect
    volume: 0.5,
    pan: -0.3, // Pan left
    envelope: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.6,
      release: 0.5,
    },
  });

  const channel2 = new VoiceChannel(440, {
    waveform: 'square',
    octave: 0,
    detune: 10, // Opposite detune
    volume: 0.5,
    pan: 0.3, // Pan right
    envelope: {
      attack: 0.02,
      decay: 0.15,
      sustain: 0.7,
      release: 0.4,
    },
  });

  // Create a Voice that manages both channels
  const voice = new Voice({
    noteNumber: 69, // MIDI note number for A4
    channels: [channel1, channel2],
  });

  // Connect to master bus
  voice.connect(masterBus.getInputNode());

  // Play both oscillators together
  voice.trigger(0.8);

  // Release after 2 seconds
  setTimeout(() => {
    voice.release();
  }, 2000);

  // Cleanup
  setTimeout(() => {
    voice.dispose();
  }, 3000);
}

// === EXAMPLE 3: Polyphonic Synthesizer with Voice Pool ===

interface PolySynthConfig {
  maxVoices: number;
  oscillator1: {
    enabled: boolean;
    waveform: 'sine' | 'sawtooth' | 'square' | 'triangle';
    octave: number;
    detune: number;
    volume: number;
    pan: number;
  };
  oscillator2: {
    enabled: boolean;
    waveform: 'sine' | 'sawtooth' | 'square' | 'triangle';
    octave: number;
    detune: number;
    volume: number;
    pan: number;
  };
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

class PolySynth {
  private config: PolySynthConfig;
  private activeVoices: Map<number, Voice> = new Map();
  private destination: AudioNode;
  private lfo: LFO | null = null;

  constructor(config: PolySynthConfig, destination: AudioNode) {
    this.config = config;
    this.destination = destination;
  }

  /**
   * Play a note with the given frequency
   */
  playNote(noteNumber: number, frequency: number, velocity: number = 1.0): void {
    // Stop existing voice if playing
    if (this.activeVoices.has(noteNumber)) {
      this.stopNote(noteNumber);
    }

    // Check voice limit
    if (this.activeVoices.size >= this.config.maxVoices) {
      // Voice stealing: stop the oldest voice
      const oldestNote = this.activeVoices.keys().next().value;
      if (oldestNote !== undefined) {
        this.stopNote(oldestNote);
      }
    }

    // Create voice channels based on config
    const channels: VoiceChannel[] = [];

    if (this.config.oscillator1.enabled) {
      const ch1 = new VoiceChannel(frequency, {
        waveform: this.config.oscillator1.waveform,
        octave: this.config.oscillator1.octave,
        detune: this.config.oscillator1.detune,
        volume: this.config.oscillator1.volume,
        pan: this.config.oscillator1.pan,
        envelope: this.config.envelope,
      });

      // Attach LFO if available
      if (this.lfo) {
        ch1.attachLFO(this.lfo);
      }

      channels.push(ch1);
    }

    if (this.config.oscillator2.enabled) {
      const ch2 = new VoiceChannel(frequency, {
        waveform: this.config.oscillator2.waveform,
        octave: this.config.oscillator2.octave,
        detune: this.config.oscillator2.detune,
        volume: this.config.oscillator2.volume,
        pan: this.config.oscillator2.pan,
        envelope: this.config.envelope,
      });

      if (this.lfo) {
        ch2.attachLFO(this.lfo);
      }

      channels.push(ch2);
    }

    // Create and trigger voice
    const voice = new Voice({ noteNumber, channels });
    voice.connect(this.destination);
    voice.trigger(velocity);

    this.activeVoices.set(noteNumber, voice);
  }

  /**
   * Release a note (begin envelope release)
   */
  releaseNote(noteNumber: number): void {
    const voice = this.activeVoices.get(noteNumber);
    if (voice) {
      voice.release();
      
      // Remove from active voices after release completes
      setTimeout(() => {
        if (this.activeVoices.get(noteNumber) === voice) {
          voice.dispose();
          this.activeVoices.delete(noteNumber);
        }
      }, this.config.envelope.release * 1000 + 100);
    }
  }

  /**
   * Stop a note immediately
   */
  stopNote(noteNumber: number): void {
    const voice = this.activeVoices.get(noteNumber);
    if (voice) {
      voice.stop();
      voice.dispose();
      this.activeVoices.delete(noteNumber);
    }
  }

  /**
   * Stop all notes
   */
  stopAllNotes(): void {
    this.activeVoices.forEach((voice) => {
      voice.stop();
      voice.dispose();
    });
    this.activeVoices.clear();
  }

  /**
   * Attach an LFO for modulation
   */
  attachLFO(lfo: LFO): void {
    this.lfo = lfo;
  }

  /**
   * Update oscillator configuration
   */
  updateConfig(config: Partial<PolySynthConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get number of active voices
   */
  getActiveVoiceCount(): number {
    return this.activeVoices.size;
  }
}

// === EXAMPLE 4: Using PolySynth ===

function example4_PolySynth() {
  const engine = AudioEngine.getInstance();
  const busManager = BusManager.getInstance();
  const masterBus = busManager.getMasterBus();

  // Create polyphonic synthesizer
  const synth = new PolySynth({
    maxVoices: 8,
    oscillator1: {
      enabled: true,
      waveform: 'sawtooth',
      octave: 0,
      detune: -5,
      volume: 0.5,
      pan: -0.2,
    },
    oscillator2: {
      enabled: true,
      waveform: 'square',
      octave: 0,
      detune: 5,
      volume: 0.4,
      pan: 0.2,
    },
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.7,
      release: 0.3,
    },
  }, masterBus.getInputNode());

  // Play a chord (C major)
  synth.playNote(60, 261.63, 0.8); // C4
  synth.playNote(64, 329.63, 0.8); // E4
  synth.playNote(67, 392.00, 0.8); // G4

  // Release after 2 seconds
  setTimeout(() => {
    synth.releaseNote(60);
    synth.releaseNote(64);
    synth.releaseNote(67);
  }, 2000);

  // Play a melody
  setTimeout(() => {
    synth.playNote(72, 523.25, 0.9); // C5
  }, 2500);

  setTimeout(() => {
    synth.releaseNote(72);
    synth.playNote(74, 587.33, 0.9); // D5
  }, 3000);

  setTimeout(() => {
    synth.releaseNote(74);
    synth.playNote(76, 659.25, 0.9); // E5
  }, 3500);

  setTimeout(() => {
    synth.releaseNote(76);
  }, 4000);

  // Cleanup
  setTimeout(() => {
    synth.stopAllNotes();
  }, 5000);
}

// Export for use
export { PolySynth };
export type { PolySynthConfig };
