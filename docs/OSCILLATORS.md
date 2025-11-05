# Oscillators Documentation

## Overview

The oscillator system provides four basic waveform generators that form the foundation of sound synthesis. All oscillators inherit from `BaseOscillator` and follow the `AudioComponent` interface.

## Available Oscillators

### 1. SineOscillator
**Pure sine wave - fundamental frequency only**

```typescript
import { SineOscillator } from './components/oscillators';

const sine = new SineOscillator(440); // A4
sine.start();
```

**Characteristics:**
- No harmonics (pure tone)
- Smooth, clean sound
- Best for: sub bass, test tones, LFO modulation

**Harmonic Content:** Only fundamental frequency

### 2. SawtoothOscillator
**Bright, buzzy wave with all harmonics**

```typescript
import { SawtoothOscillator } from './components/oscillators';

const saw = new SawtoothOscillator(220); // A3
saw.start();
```

**Characteristics:**
- Contains all harmonics (odd and even)
- Bright, aggressive sound
- Best for: leads, bass, strings, brass

**Harmonic Content:** 1/n amplitude for each harmonic

### 3. SquareOscillator
**Hollow wave with odd harmonics**

```typescript
import { SquareOscillator } from './components/oscillators';

const square = new SquareOscillator(330); // E4
square.start();
```

**Characteristics:**
- Contains odd harmonics only
- Hollow, woody sound
- Best for: clarinet-like tones, retro games, electronic leads

**Harmonic Content:** 1/n amplitude for odd harmonics only

### 4. TriangleOscillator
**Soft wave with reduced odd harmonics**

```typescript
import { TriangleOscillator } from './components/oscillators';

const triangle = new TriangleOscillator(440); // A4
triangle.start();
```

**Characteristics:**
- Odd harmonics with 1/n² amplitude
- Soft, mellow sound
- Best for: flutes, soft pads, warm bass

**Harmonic Content:** 1/n² amplitude for odd harmonics

## Common API

All oscillators share the same interface:

### Start/Stop Control

```typescript
// Start oscillator
oscillator.start();           // Start immediately
oscillator.start(time);       // Start at specific time

// Stop oscillator
oscillator.stop();            // Stop immediately
oscillator.stop(time);        // Stop at specific time

// Check if playing
if (oscillator.isOscillatorPlaying()) {
  console.log('Oscillator is running');
}
```

### Parameter Control

```typescript
// Set frequency (20 Hz - 20,000 Hz)
oscillator.setParameter('frequency', 440);

// Set detune (-1200 to +1200 cents)
oscillator.setParameter('detune', 50);

// Set volume (0.0 - 1.0)
oscillator.setParameter('volume', 0.7);

// Get parameter value
const freq = oscillator.getParameter('frequency');
```

### Musical Note Control

```typescript
// Set frequency from MIDI note number (0-127)
oscillator.setNoteNumber(69);  // A4

// Set frequency from note name
oscillator.setNoteName('A4');   // 440 Hz
oscillator.setNoteName('C3');   // 130.81 Hz
oscillator.setNoteName('F#5');  // 739.99 Hz
```

### Connection to Bus System

```typescript
import { BusManager } from './bus';

const busManager = BusManager.getInstance();
const masterBus = busManager.getMasterBus();

// Connect oscillator to bus
oscillator.connect(masterBus.getInputNode());

// Disconnect when done
oscillator.disconnect();
```

### Enable/Disable

```typescript
// Disable oscillator (mutes without stopping)
oscillator.disable();

// Re-enable
oscillator.enable();

// Check state
if (oscillator.isEnabled()) {
  console.log('Oscillator is enabled');
}
```

## Complete Example

```typescript
import { SawtoothOscillator } from './components/oscillators';
import { BusManager } from './bus';

// Get bus manager
const busManager = BusManager.getInstance();
const masterBus = busManager.getMasterBus();

// Create oscillator
const lead = new SawtoothOscillator();

// Configure
lead.setNoteName('A4');
lead.setParameter('volume', 0.5);
lead.setParameter('detune', 10); // Slight detuning

// Connect to bus
lead.connect(masterBus.getInputNode());

// Play
lead.start();

// Stop after 2 seconds
setTimeout(() => {
  lead.stop();
}, 2000);
```

## Multiple Oscillators (Unison)

Create thick sounds by layering detuned oscillators:

```typescript
import { SawtoothOscillator } from './components/oscillators';

// Create three detuned oscillators
const osc1 = new SawtoothOscillator(440);
const osc2 = new SawtoothOscillator(440);
const osc3 = new SawtoothOscillator(440);

// Detune for thickness
osc1.setParameter('detune', -10);
osc2.setParameter('detune', 0);
osc3.setParameter('detune', 10);

// Reduce volume to prevent clipping
osc1.setParameter('volume', 0.3);
osc2.setParameter('volume', 0.3);
osc3.setParameter('volume', 0.3);

// Connect all to bus
[osc1, osc2, osc3].forEach(osc => {
  osc.connect(masterBus.getInputNode());
  osc.start();
});
```

## Parameter Ranges

| Parameter | Min | Max | Default | Unit |
|-----------|-----|-----|---------|------|
| frequency | 20 | 20000 | 440 | Hz |
| detune | -1200 | 1200 | 0 | cents |
| volume | 0 | 1 | 0.5 | linear |

## Note Name Format

Supported formats: `C0` to `B8`
- Letter: A-G
- Accidental: # (sharp) or b (flat)
- Octave: 0-8

Examples: `C4`, `F#3`, `Bb5`

## Best Practices

1. **Always stop oscillators** when done to free resources
2. **Ramp volume to 0** before stopping to prevent clicks
3. **Use detune** for chorus/unison effects
4. **Layer oscillators** for richer sounds
5. **Connect to buses** rather than directly to destination
6. **Set volume < 1.0** when using multiple oscillators

## Next Steps

- Add **filters** to shape oscillator output
- Add **envelopes** for dynamic amplitude control
- Add **effects** to the bus for processing
- Create **presets** combining multiple oscillators
