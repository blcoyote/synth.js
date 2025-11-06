# Multi-Target LFO Enhancement

## Overview
The LFO (Low Frequency Oscillator) has been enhanced to support multiple modulation targets simultaneously. You can now modulate multiple parameters with a single LFO!

## Features

### Modulation Targets
The LFO can now modulate:
1. **Pitch (Vibrato)** - Oscillates the pitch of oscillators
2. **Volume (Tremolo)** - Oscillates the volume/amplitude
3. **Pan (Auto-Pan)** - Oscillates the stereo position left/right
4. **Filter Cutoff** - Oscillates the filter cutoff frequency

### UI Controls
In the LFO module, you'll find checkboxes to enable/disable each target:
- ☑️ Pitch (Vibrato) - *enabled by default*
- ☐ Volume (Tremolo)
- ☐ Pan (Auto-Pan)
- ☐ Filter Cutoff

### Shared Parameters
All targets share these controls:
- **Waveform**: Sine, Triangle, Square, Sawtooth, Random
- **Rate**: 0.1 Hz to 20 Hz (how fast the modulation cycles)
- **Depth**: 0-100% (how much modulation is applied)

## How It Works

### MultiTargetLFO Class
The new `MultiTargetLFO` class allows you to:

```typescript
// Create a multi-target LFO
const lfo = new MultiTargetLFO({
  frequency: 5.0,    // 5 Hz
  waveform: 'sine'
});

// Add targets with individual depth control
lfo.addTarget('pitch', oscillator.frequency, 50, 440);  // 50 cents around 440 Hz
lfo.addTarget('volume', gainNode.gain, 0.3, 0.5);      // 0.3 around 0.5
lfo.addTarget('pan', panNode.pan, 0.5, 0);             // 0.5 around center
lfo.addTarget('filter', filter.frequency, 1000, 2000); // 1000 Hz around 2000 Hz

// Start modulation
lfo.start();

// Update depth for specific target
lfo.setTargetDepth('pitch', 100); // Increase vibrato depth

// Remove a target
lfo.removeTarget('pan'); // Stop modulating pan

// Stop all modulation
lfo.stop();
```

### Key Methods

**addTarget(name, param, depth, baseline)**
- `name`: Identifier for this target
- `param`: The AudioParam to modulate
- `depth`: Modulation depth (range depends on parameter)
- `baseline`: Center value around which to oscillate

**removeTarget(name)**
- Removes a target and resets its parameter to baseline

**setTargetDepth(name, depth)**
- Updates modulation depth for a specific target

**setFrequency(hz)**
- Sets the LFO rate (affects all targets)

**setWaveform(waveform)**
- Sets the LFO waveform (sine, triangle, square, sawtooth, random)

## Usage Examples

### Example 1: Classic Vibrato
```typescript
const lfo = new MultiTargetLFO({ frequency: 5.0, waveform: 'sine' });
lfo.addTarget('pitch', oscillator.frequency, 20, 440); // ±20 cents around 440Hz
lfo.start();
```

### Example 2: Tremolo Effect
```typescript
const lfo = new MultiTargetLFO({ frequency: 4.0, waveform: 'sine' });
lfo.addTarget('volume', gainNode.gain, 0.4, 0.6); // Oscillate between 0.2 and 1.0
lfo.start();
```

### Example 3: Auto-Pan
```typescript
const lfo = new MultiTargetLFO({ frequency: 0.5, waveform: 'sine' });
lfo.addTarget('pan', panNode.pan, 1.0, 0); // Full left-right sweep
lfo.start();
```

### Example 4: Filter Sweep
```typescript
const lfo = new MultiTargetLFO({ frequency: 0.25, waveform: 'triangle' });
lfo.addTarget('filter', filter.frequency, 3000, 1000); // Sweep 1000-4000 Hz
lfo.start();
```

### Example 5: Combined Modulation
```typescript
const lfo = new MultiTargetLFO({ frequency: 3.0, waveform: 'sine' });
lfo.addTarget('pitch', osc1.frequency, 30, 440);
lfo.addTarget('volume', gainNode.gain, 0.2, 0.7);
lfo.addTarget('filter', filter.frequency, 500, 2000);
lfo.start();
// Now you have vibrato, tremolo, AND filter sweep all synchronized!
```

## Implementation Details

### Architecture
- Each target gets its own **GainNode** for independent depth control
- The main oscillator connects to all gain nodes simultaneously
- Each gain node connects to its target AudioParam
- Depth scaling is applied per-target through the gain value

### Signal Flow
```
LFO Oscillator
    ├─> Gain Node 1 (depth) ─> Pitch Parameter
    ├─> Gain Node 2 (depth) ─> Volume Parameter
    ├─> Gain Node 3 (depth) ─> Pan Parameter
    └─> Gain Node 4 (depth) ─> Filter Parameter
```

### Benefits Over Single-Target LFO
1. **One Source, Multiple Destinations**: Single LFO oscillator feeds multiple targets
2. **Synchronized Modulation**: All targets move together in perfect sync
3. **Independent Depth Control**: Each target can have different modulation amounts
4. **Dynamic Routing**: Add/remove targets on the fly
5. **Efficient**: Reuses single oscillator instead of creating multiple LFOs

## UI Integration

The synth demo now includes:
- Checkboxes to enable/disable each modulation target
- Shared rate and depth controls
- Visual feedback when LFO is active
- Real-time parameter updates

Try enabling multiple targets at once for complex, evolving sounds!

## Future Enhancements

Potential additions:
- Per-target waveform selection
- Phase offset between targets
- Bipolar vs unipolar mode selection
- Envelope follower integration
- MIDI CC mapping for modulation control
