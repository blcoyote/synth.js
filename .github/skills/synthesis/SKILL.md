---
name: synthesis
description: 'Guide implementation of synthesis features: oscillators, filters, effects, modulation, envelopes, voice management. Use for adding new audio components, designing DSP algorithms, optimizing Web Audio performance, implementing modulation routing.'
argument-hint: 'Describe the synthesis feature to implement or concept to explain'
---

# Audio Synthesis Implementation

Expert guidance for implementing synthesis features using Web Audio API with focus on real-time performance and modular architecture.

## When to Use

- Implementing new oscillators, filters, or effects
- Designing modulation routing and LFO systems
- Optimizing voice management and polyphony
- Understanding DSP concepts for audio programming
- Debugging audio parameter updates or signal flow
- Reviewing synthesis code for Web Audio best practices

## Core Synthesis Concepts

### Signal Flow Architecture
```
Oscillator → Filter → Envelope → Effects Chain → Master Output
              ↑         ↑
            LFO ←→ Modulation Router
```

### Web Audio Graph Pattern
- **AudioNode**: Core building block (oscillator, filter, gain, etc.)
- **Connect/Disconnect**: Build signal paths dynamically
- **AudioParam**: automatable parameters with scheduling
- **AudioContext**: Manages audio processing graph and timing

## Implementation Procedures

### 1. Adding New Oscillators

**Pattern:**
```typescript
class CustomOscillator {
  private oscillator: OscillatorNode;
  private gainNode: GainNode;
  
  constructor(context: AudioContext, frequency: number) {
    this.oscillator = context.createOscillator();
    this.gainNode = context.createGain();
    
    this.oscillator.frequency.value = frequency;
    this.oscillator.connect(this.gainNode);
  }
  
  connect(destination: AudioNode) {
    this.gainNode.connect(destination);
  }
  
  start(time?: number) {
    this.oscillator.start(time);
  }
  
  stop(time?: number) {
    this.oscillator.stop(time);
  }
}
```

**Key Considerations:**
- Use `GainNode` for volume control (never set oscillator.gain directly)
- Initialize frequency before starting
- Support both immediate and scheduled start/stop
- Clean up nodes after stop to prevent memory leaks

**Real-time Updates:**
- Frequency, detune: Update via `AudioParam.value`
- Waveform type: Requires creating new oscillator (immutable)
- Update both config AND active voices for polyphony

See [oscillator-types.md](./references/oscillator-types.md) for waveform characteristics.

### 2. Implementing Filters

**Base Pattern (extends BaseFilter):**
```typescript
export class CustomFilter extends BaseFilter {
  protected filterNode: BiquadFilterNode;
  
  constructor() {
    super('Custom Filter', 'custom-filter');
    this.filterNode = this.engine.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.connectWetPath(this.filterNode);
  }
  
  setParameter(param: string, value: number): void {
    switch(param) {
      case 'cutoff':
        this.filterNode.frequency.value = value;
        break;
      case 'resonance':
        this.filterNode.Q.value = value;
        break;
    }
  }
}
```

**Filter Types:**
- Lowpass: Smooth, warm (use Q: 0.7-10 for resonance)
- Highpass: Bright, thin (use Q: 0.7-5)
- Bandpass: Vocal, narrow (use Q: 1-20)
- Notch: Phase effects (use Q: 1-100)
- Allpass: Phase manipulation without gain change

**Parameter Ranges:**
- Cutoff: 20-20000 Hz (use logarithmic scaling for UI)
- Q/Resonance: 0.0001-1000 (typically 0.7-20)
- Gain (peaking/shelving): -40 to +40 dB

See [filter-design.md](./references/filter-design.md) for advanced techniques.

### 3. Creating Effects (extends BaseEffect)

**Effect Chain Pattern:**
```typescript
export class CustomEffect extends BaseEffect {
  private effectNode: AudioNode;
  
  constructor() {
    super('Effect Name', 'effect-id');
    
    // Create effect processing nodes
    this.effectNode = this.engine.createBiquadFilter();
    
    // Connect wet signal path (dry is handled by BaseEffect)
    this.connectWetPath(this.effectNode);
  }
  
  setParameter(param: string, value: number): void {
    // Implement parameter updates
  }
}
```

**BaseEffect Provides:**
- Wet/dry mix control (0.0-1.0)
- Bypass functionality
- Input/output connection points
- Consistent interface for effects chain

**Common Effect Types:**
- **Time-based**: Delay, reverb, chorus (use DelayNode)
- **Dynamics**: Compressor, limiter (use DynamicsCompressorNode)
- **Distortion**: Overdrive, fuzz (use WaveShaperNode)
- **Modulation**: Flanger, phaser (LFO + DelayNode/AllpassFilter)

See [effects-cookbook.md](./references/effects-cookbook.md) for recipes.

### 4. Envelope Systems (ADSR)

**Envelope Pattern:**
```typescript
export class ADSREnvelope {
  constructor(
    private gainNode: GainNode,
    private attack: number,
    private decay: number,
    private sustain: number,
    private release: number
  ) {}
  
  trigger(time: number): void {
    const gain = this.gainNode.gain;
    gain.cancelScheduledValues(time);
    gain.setValueAtTime(0, time);
    
    // Attack
    gain.linearRampToValueAtTime(1, time + this.attack);
    
    // Decay to sustain
    gain.linearRampToValueAtTime(this.sustain, time + this.attack + this.decay);
  }
  
  release(time: number): void {
    const gain = this.gainNode.gain;
    gain.cancelScheduledValues(time);
    gain.setValueAtTime(gain.value, time);
    gain.linearRampToValueAtTime(0, time + this.release);
  }
}
```

**Scheduling Best Practices:**
- Always use `AudioContext.currentTime` for scheduling
- Call `cancelScheduledValues()` before new automation
- Use `setValueAtTime()` to anchor ramps
- Prefer `exponentialRampToValueAtTime()` for natural decay (never ramp to 0, use 0.001)

**Envelope Curves:**
- Linear: Good for amplitude envelopes
- Exponential: Natural for decay/release (sounds more musical)
- Custom: Use `setValueCurveAtTime()` for complex shapes

### 5. Modulation Routing

**LFO Implementation:**
```typescript
export class LFO {
  private oscillator: OscillatorNode;
  private gainNode: GainNode;
  
  constructor(
    private context: AudioContext,
    private rate: number,
    private depth: number
  ) {
    this.oscillator = context.createOscillator();
    this.gainNode = context.createGain();
    
    this.oscillator.frequency.value = rate;
    this.gainNode.gain.value = depth;
    this.oscillator.connect(this.gainNode);
  }
  
  connect(destination: AudioParam): void {
    this.gainNode.connect(destination);
  }
  
  start(): void {
    this.oscillator.start();
  }
}
```

**Modulation Targets:**
- Oscillator frequency (vibrato)
- Filter cutoff (wah effect)
- Gain (tremolo)
- Pan (auto-pan)
- Effect parameters (animated effect)

**Depth Scaling:**
- Calculate appropriate depth range for target parameter
- Example: Filter cutoff 200-2000Hz → depth = 900 (±900Hz around center)
- Use offset nodes to set center point

See [modulation-routing.md](./references/modulation-routing.md) for advanced patterns.

### 6. Voice Management & Polyphony

**Voice Allocation Pattern:**
```typescript
interface Voice {
  note: number;
  oscillators: OscillatorData[];
  filterNode: BiquadFilterNode;
  gainNode: GainNode;
  startTime: number;
}

class VoiceManager {
  private activeVoices = new Map<number, Voice>();
  private maxVoices = 32;
  
  noteOn(note: number, velocity: number): void {
    // Steal oldest voice if at max
    if (this.activeVoices.size >= this.maxVoices) {
      this.stealVoice();
    }
    
    // Create and start voice
    const voice = this.createVoice(note, velocity);
    this.activeVoices.set(note, voice);
  }
  
  noteOff(note: number): void {
    const voice = this.activeVoices.get(note);
    if (voice) {
      this.releaseVoice(voice);
      this.activeVoices.delete(note);
    }
  }
}
```

**Voice Stealing Strategies:**
- Oldest note first (FIFO)
- Quietest note (by envelope level)
- Lowest priority (release phase notes first)

**Performance Optimization:**
- Limit max voices (32-64 typical)
- Reuse oscillator nodes when possible
- Clean up stopped voices immediately
- Use object pooling for voice structures

## Web Audio Best Practices

### Parameter Updates
```typescript
// ❌ Bad: Direct assignment without scheduling
filterNode.frequency.value = newValue;

// ✅ Good: Scheduled with context time
const now = context.currentTime;
filterNode.frequency.setTargetAtTime(newValue, now, 0.01);

// ✅ Also good: Smooth ramp
filterNode.frequency.linearRampToValueAtTime(newValue, now + 0.05);
```

### Node Cleanup
```typescript
// ❌ Bad: Memory leak
oscillator.stop();

// ✅ Good: Cleanup after stop
oscillator.stop(context.currentTime);
oscillator.disconnect();
oscillator = null;
```

### Avoiding Clicks/Pops
- Never set gain to 0 instantly (use 0.001 instead)
- Always ramp or use `setTargetAtTime()` for parameter changes
- Schedule note-offs with release envelope
- Use window functions for buffer playback

### Performance Considerations
- Minimize node creation in audio callback
- Pre-create and reuse nodes when possible
- Limit active voices (voice stealing)
- Use OfflineAudioContext for pre-rendering
- Profile with Chrome DevTools → Performance → Audio

## Debugging Audio Issues

### No Sound
1. Check if AudioContext is "running" (not "suspended")
2. Verify complete signal path (oscillator → ... → destination)
3. Check gain values (non-zero)
4. Verify oscillator.start() was called

### Clicks/Pops
1. Add envelope to gain changes
2. Use ramps instead of direct value assignment
3. Check for scheduled values conflicts (cancelScheduledValues)

### Distortion/Clipping
1. Check gain staging (sum of voices * max gain)
2. Add compressor or limiter to master output
3. Reduce individual voice gain
4. Check for feedback loops in modulation

### Wrong Pitch
1. Verify frequency calculation (A4 = 440Hz)
2. Check detune values (cents, not Hz)
3. Ensure sampleRate matches context.sampleRate

## Integration with synth.js Architecture

### State Updates Pattern
```typescript
// CRITICAL: Update both config AND active voices
const config = voiceState.oscillatorConfigs.get(oscNum)!;
config.volume = newValue;

voiceState.activeVoices.forEach((voice) => {
  voice.oscillators.forEach((oscData) => {
    if (oscData.oscNum === oscNum) {
      oscData.gainNode.gain.setTargetAtTime(newValue, now, 0.01);
    }
  });
});
```

### Manager Pattern
```typescript
// Managers receive dependencies via constructor
export class CustomManager {
  constructor(
    private audioEngine: AudioEngine,
    private voiceManager: VoiceManager
  ) {}
  
  // Access audio context
  private get context(): AudioContext {
    return this.audioEngine.getContext();
  }
}
```

### State Module Access
```typescript
// Import grouped state objects
import { audioState, voiceState, modulationState } from '../state';

// Access via dot notation
const filterSettings = audioState.filterSettings;
const activeVoices = voiceState.activeVoices;
```

## Common Synthesis Calculations

### Frequency to MIDI Note
```typescript
const midiNote = 69 + 12 * Math.log2(frequency / 440);
```

### MIDI Note to Frequency
```typescript
const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
```

### Cents to Frequency Ratio
```typescript
const ratio = Math.pow(2, cents / 1200);
```

### Decibels to Gain
```typescript
const gain = Math.pow(10, dB / 20);
```

### Gain to Decibels
```typescript
const dB = 20 * Math.log10(gain);
```

## References

Load these for deeper dives into specific topics:
- [oscillator-types.md](./references/oscillator-types.md) - Waveform characteristics and use cases
- [filter-design.md](./references/filter-design.md) - Filter topologies and resonance
- [effects-cookbook.md](./references/effects-cookbook.md) - Common effect algorithms
- [modulation-routing.md](./references/modulation-routing.md) - Advanced modulation matrices
- [dsp-fundamentals.md](./references/dsp-fundamentals.md) - Sample rate, aliasing, Nyquist

## Quick Reference

| Task | Primary Tool | Key Consideration |
|------|--------------|-------------------|
| Oscillator | `OscillatorNode` | Immutable type, use gain for volume |
| Filter | `BiquadFilterNode` | Logarithmic cutoff scaling |
| Effect | `BaseEffect` class | Wet/dry mix, bypass support |
| Envelope | `AudioParam` automation | Cancel before new schedules |
| LFO | Low-freq `OscillatorNode` | Connect to `AudioParam` |
| Polyphony | Voice pooling | Limit max voices, steal oldest |
| Performance | Node reuse | Pre-create, minimize allocation |
