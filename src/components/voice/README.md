# Voice Architecture

## Overview

The Voice module provides high-level abstractions for managing synthesizer voices, making it easy to build polyphonic synthesizers with multiple oscillators per note.

## Components

### VoiceChannel
A `VoiceChannel` encapsulates a complete voice with:
- **Oscillator** (sine, sawtooth, square, triangle)
- **ADSR Envelope** for amplitude shaping
- **Pan Node** for stereo positioning
- **LFO Modulation** support (optional)

**Use when:** You need a single oscillator with envelope and effects.

### Voice
A `Voice` manages multiple `VoiceChannel` instances that are triggered together.

**Use when:** You want to layer multiple oscillators (e.g., Oscillator 1 + Oscillator 2) for a richer sound.

## Basic Usage

### Single Oscillator Voice

```typescript
import { VoiceChannel } from './components/voice';
import { AudioEngine } from './core';

const engine = AudioEngine.getInstance();

// Create a voice channel
const voice = new VoiceChannel(440, {
  waveform: 'sawtooth',
  volume: 0.7,
  pan: 0,
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.3,
  },
});

// Connect and play
voice.connect(engine.getDestination());
voice.trigger(1.0); // velocity

// Release after 1 second
setTimeout(() => voice.release(), 1000);
```

### Multi-Oscillator Voice

```typescript
import { VoiceChannel, Voice } from './components/voice';

// Create two oscillator channels
const channel1 = new VoiceChannel(440, {
  waveform: 'sawtooth',
  detune: -10,
  volume: 0.5,
  pan: -0.3,
});

const channel2 = new VoiceChannel(440, {
  waveform: 'square',
  detune: 10,
  volume: 0.5,
  pan: 0.3,
});

// Combine into a single voice
const voice = new Voice({
  noteNumber: 69, // MIDI A4
  channels: [channel1, channel2],
});

voice.connect(destination);
voice.trigger(0.8);
```

## Polyphonic Synthesizer

See `examples/voice-usage-examples.ts` for a complete `PolySynth` class that manages multiple voices with:
- Voice limiting (max polyphony)
- Voice stealing (oldest voice)
- Per-oscillator configuration
- LFO modulation support

### Quick Example

```typescript
const synth = new PolySynth({
  maxVoices: 8,
  oscillator1: {
    enabled: true,
    waveform: 'sawtooth',
    volume: 0.5,
    // ...
  },
  oscillator2: {
    enabled: true,
    waveform: 'square',
    volume: 0.4,
    // ...
  },
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.3,
  },
}, destination);

// Play notes
synth.playNote(60, 261.63, 0.8); // C4
synth.playNote(64, 329.63, 0.8); // E4
synth.playNote(67, 392.00, 0.8); // G4

// Release
synth.releaseNote(60);
```

## Benefits Over Manual Management

### Before (Manual)
```typescript
// Create oscillator
const osc = new SawtoothOscillator(440);
osc.setParameter('volume', 0.7);
osc.setParameter('detune', -10);

// Create pan
const pan = context.createStereoPanner();
pan.pan.value = -0.3;

// Create envelope
const env = new ADSREnvelope({ attack: 0.01, ... });

// Connect chain
osc.connect(pan);
pan.connect(env.getInputNode());
env.connect(destination);

// Start
osc.start();
env.trigger(1.0);

// Release (remember to cleanup all nodes!)
env.triggerRelease();
setTimeout(() => {
  osc.stop();
  osc.disconnect();
  pan.disconnect();
  env.disconnect();
}, releaseTime);
```

### After (VoiceChannel)
```typescript
const voice = new VoiceChannel(440, {
  waveform: 'sawtooth',
  volume: 0.7,
  detune: -10,
  pan: -0.3,
  envelope: { attack: 0.01, ... },
});

voice.connect(destination);
voice.trigger(1.0);
voice.release();
// Auto-cleanup after release!
```

## Scaling to Polyphony

The Voice architecture makes it trivial to scale from monophonic to polyphonic:

1. **Store active voices in a Map**
   ```typescript
   const voices = new Map<number, Voice>();
   ```

2. **On note-on**: Create and store voice
   ```typescript
   function playNote(noteNum: number, freq: number) {
     const channels = [
       new VoiceChannel(freq, config1),
       new VoiceChannel(freq, config2),
     ];
     const voice = new Voice({ noteNumber: noteNum, channels });
     voice.connect(destination);
     voice.trigger(velocity);
     voices.set(noteNum, voice);
   }
   ```

3. **On note-off**: Release and cleanup
   ```typescript
   function releaseNote(noteNum: number) {
     const voice = voices.get(noteNum);
     if (voice) {
       voice.release();
       setTimeout(() => {
         voice.dispose();
         voices.delete(noteNum);
       }, releaseTime);
     }
   }
   ```

## API Reference

### VoiceChannel

#### Constructor
```typescript
new VoiceChannel(frequency: number, config: VoiceChannelConfig)
```

#### Methods
- `connect(destination: AudioNode): void`
- `disconnect(): void`
- `trigger(velocity?: number): void` - Start note
- `release(): void` - Begin envelope release
- `stop(): void` - Stop immediately
- `dispose(): void` - Cleanup all resources
- `attachLFO(lfo: LFO): void` - Add vibrato/modulation
- `detachLFO(): void` - Remove modulation
- `setFrequency(freq: number): void`
- `setVolume(vol: number): void`
- `setPan(pan: number): void`
- `setDetune(cents: number): void`
- `isPlaying(): boolean`

### Voice

#### Constructor
```typescript
new Voice(config: VoiceConfig)
```

#### Methods
- `connect(destination: AudioNode): void`
- `disconnect(): void`
- `trigger(velocity?: number): void` - Trigger all channels
- `release(): void` - Release all channels
- `stop(): void` - Stop all channels
- `dispose(): void` - Cleanup
- `isActive(): boolean`
- `getChannels(): readonly VoiceChannel[]`
- `getChannel(index: number): VoiceChannel | undefined`

## Migration Guide

To refactor your existing synth-demo.ts:

1. Replace individual oscillator/envelope/pan creation with `VoiceChannel`
2. Group related channels into a `Voice`
3. Use a Map to track active voices by note number
4. Simplify playNote/releaseNote functions

See `examples/voice-usage-examples.ts` for complete working examples!
