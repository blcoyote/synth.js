# Envelopes & Modulation

## Overview
Modular envelope generators and LFO (Low Frequency Oscillator) components that can be applied to any parameter in the synthesizer.

## Components

### ADSREnvelope
Classic Attack-Decay-Sustain-Release envelope generator.

**File:** `src/components/envelopes/ADSREnvelope.ts`

#### Parameters
- **Attack** (0.001-2s): Time to reach peak level
- **Decay** (0.001-2s): Time to fall from peak to sustain
- **Sustain** (0-1): Held level while note is active
- **Release** (0.001-5s): Time to fall to zero after note release

#### Usage
```typescript
import { ADSREnvelope } from './components/envelopes';

// Create envelope
const envelope = new ADSREnvelope({
  attack: 0.01,   // 10ms
  decay: 0.1,     // 100ms
  sustain: 0.7,   // 70%
  release: 0.3    // 300ms
});

// Connect in signal chain
oscillator.connect(envelope.getNode());
envelope.connect(destination);

// Trigger envelope
envelope.trigger(1.0); // velocity 0-1

// Release envelope
envelope.triggerRelease();
```

#### Key Methods
- `trigger(velocity)` - Start attack phase
- `triggerRelease()` - Start release phase
- `isTriggered()` - Check if in active phase
- `hasFinished()` - Check if fully released
- `reset()` - Reset to initial state

#### Typical Applications
- **Amplitude Envelope**: Control volume over time
- **Filter Envelope**: Modulate filter cutoff
- **Pitch Envelope**: Create pitch bends
- **Pan Envelope**: Automate stereo position

---

### LFO (Low Frequency Oscillator)
Cyclic modulation source with multiple waveforms.

**File:** `src/components/modulation/LFO.ts`

#### Parameters
- **Frequency** (0.01-20 Hz): LFO rate/speed
- **Depth** (0-1): Modulation amount
- **Waveform**: Modulation shape
  - Sine: Smooth, musical
  - Triangle: Linear ramps
  - Square: On/off switching
  - Sawtooth: Ramp up/down
  - Random: Sample & hold

#### Usage
```typescript
import { LFO } from './components/modulation';

// Create LFO
const lfo = new LFO({
  frequency: 2.0,      // 2 Hz
  depth: 0.5,          // 50% depth
  waveform: 'sine'
});

// Connect to parameter (AudioParam)
lfo.connectToParam(oscillator.getNode().frequency);

// Start/stop
lfo.start();
lfo.stop();

// Change waveform
lfo.setWaveform('triangle');
```

#### Key Methods
- `start()` - Start LFO
- `stop()` - Stop LFO
- `connectToParam(AudioParam)` - Connect to Web Audio parameter
- `setWaveform(waveform)` - Change waveform
- `getWaveform()` - Get current waveform

#### Typical Applications
- **Vibrato**: Modulate frequency (5-8 Hz)
- **Tremolo**: Modulate amplitude (2-6 Hz)
- **Auto-Pan**: Modulate stereo position (0.5-2 Hz)
- **Filter Sweep**: Modulate filter cutoff (0.1-5 Hz)
- **Chorus/Flanger**: Modulate delay time (0.1-1 Hz)

---

## Modular Design Principles

### 1. **Reusable Components**
Envelopes and LFOs are standalone components that can be instantiated multiple times:
```typescript
const ampEnvelope = new ADSREnvelope({ attack: 0.01, release: 0.3 });
const filterEnvelope = new ADSREnvelope({ attack: 0.5, release: 1.0 });
const vibratoLFO = new LFO({ frequency: 6, depth: 0.1 });
const tremoloLFO = new LFO({ frequency: 4, depth: 0.3 });
```

### 2. **Any Parameter Modulation**
Connect to any AudioParam in the Web Audio graph:
```typescript
// Modulate oscillator frequency (vibrato)
lfo.connectToParam(oscillator.getNode().frequency);

// Modulate filter cutoff (wah effect)
lfo.connectToParam(filter.getNode().frequency);

// Modulate gain (tremolo)
lfo.connectToParam(gainNode.gain);

// Modulate pan (auto-pan)
lfo.connectToParam(panNode.pan);
```

### 3. **Signal Chain Integration**
Envelopes can be part of the audio signal chain:
```typescript
// Amplitude envelope (signal passes through)
oscillator -> envelope -> destination

// Parallel routing
oscillator -> [envelope1, envelope2] -> mixer -> destination
```

### 4. **Independent Control**
Each instance has independent parameters:
```typescript
envelope1.setParameter('attack', 0.01);  // Fast attack
envelope2.setParameter('attack', 1.0);   // Slow attack
```

---

## Example: Complete Voice Architecture

```typescript
import { SawtoothOscillator } from './components/oscillators';
import { LowpassFilter } from './components/filters';
import { ADSREnvelope } from './components/envelopes';
import { LFO } from './components/modulation';

// Oscillator with vibrato
const osc = new SawtoothOscillator(440);
const vibrato = new LFO({ frequency: 5, depth: 0.05, waveform: 'sine' });
vibrato.connectToParam(osc.getNode().frequency);
vibrato.start();

// Filter with envelope
const filter = new LowpassFilter(1000, 0.5);
const filterEnv = new ADSREnvelope({ 
  attack: 0.1, 
  decay: 0.3, 
  sustain: 0.4, 
  release: 0.5 
});

// Amplitude envelope
const ampEnv = new ADSREnvelope({
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3
});

// Signal chain
osc.connect(filter.getNode());
filter.connect(ampEnv.getNode());
ampEnv.connect(destination);

// Filter envelope modulates cutoff
filterEnv.getNode().connect(filter.getNode().frequency);

// Trigger note
osc.start();
ampEnv.trigger(1.0);
filterEnv.trigger(1.0);

// Release note
ampEnv.triggerRelease();
filterEnv.triggerRelease();
```

---

## Advanced Techniques

### 1. **Envelope Amount Control**
Scale envelope depth using a gain node:
```typescript
const envScale = audioContext.createGain();
envScale.gain.value = 0.5; // 50% envelope amount
envelope.connect(envScale);
envScale.connect(filter.frequency);
```

### 2. **LFO Fade In**
Gradually introduce LFO modulation:
```typescript
lfo.getNode().gain.setValueAtTime(0, now);
lfo.getNode().gain.linearRampToValueAtTime(0.5, now + 2.0);
```

### 3. **Multiple LFO Modulation**
Combine multiple LFOs:
```typescript
lfo1.connectToParam(param);
lfo2.connectToParam(param);
// Both LFOs modulate the same parameter
```

### 4. **Envelope Looping**
Create repeating envelopes:
```typescript
function loop() {
  envelope.trigger(1.0);
  setTimeout(() => {
    envelope.triggerRelease();
    setTimeout(loop, releaseTime * 1000);
  }, (attack + decay + holdTime) * 1000);
}
```

---

## Performance Considerations

1. **Stop unused LFOs**: Call `lfo.stop()` when not needed
2. **Envelope pooling**: Reuse envelope instances for polyphonic voices
3. **Parameter smoothing**: Web Audio handles smoothing automatically
4. **Random LFO efficiency**: Uses setInterval, less efficient than oscillator-based

---

## Future Enhancements

- [ ] Multi-stage envelopes (AHDSR, complex shapes)
- [ ] Envelope followers (react to audio input)
- [ ] Envelope retrigger modes (legato, retrigger)
- [ ] LFO sync (tempo-synced rates)
- [ ] LFO phase reset
- [ ] Bipolar/unipolar LFO modes
- [ ] Envelope curve types (linear, exponential, logarithmic)
