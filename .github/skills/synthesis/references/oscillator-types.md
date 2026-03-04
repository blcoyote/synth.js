# Oscillator Types & Waveforms

## Basic Waveforms

### Sine Wave
**Characteristics:**
- Pure tone, single harmonic (fundamental frequency only)
- Softest, smoothest sound
- Low spectral content

**Use Cases:**
- Sub-bass (no harmonics to muddy low end)
- LFO modulation (smooth, predictable)
- Test tones and calibration
- FM synthesis carrier/modulator

**Web Audio:**
```typescript
oscillator.type = 'sine';
```

### Triangle Wave
**Characteristics:**
- Odd harmonics only (1, 3, 5, 7...)
- Harmonic amplitude decreases by 1/n²
- Softer than square, warmer than sine
- Medium spectral content

**Use Cases:**
- Mellow leads and pads
- Flute-like sounds
- Gentler than square wave

**Web Audio:**
```typescript
oscillator.type = 'triangle';
```

### Sawtooth Wave
**Characteristics:**
- All harmonics (1, 2, 3, 4...)
- Harmonic amplitude decreases by 1/n
- Brightest standard waveform
- Rich spectral content

**Use Cases:**
- Classic analog synth leads
- Brass-like timbres
- Aggressive basses
- Filter sweeps (provides material to filter)

**Web Audio:**
```typescript
oscillator.type = 'sawtooth';
```

### Square Wave
**Characteristics:**
- Odd harmonics only (1, 3, 5, 7...)
- Harmonic amplitude decreases by 1/n
- Hollow, "woody" sound
- High spectral content

**Use Cases:**
- Clarinet-like tones
- Retro game sounds (8-bit)
- Pulse bass (with high resonance filter)

**Web Audio:**
```typescript
oscillator.type = 'square';
```

## Advanced Waveforms

### Pulse Width Modulation (PWM)
**Implementation:**
Not directly available in Web Audio. Simulate by:
1. Using two sawtooth waves
2. Inverting one polarity
3. Mixing with adjustable balance

```typescript
const saw1 = context.createOscillator();
const saw2 = context.createOscillator();
const inverter = context.createGain();
const mixer = context.createGain();

saw1.type = 'sawtooth';
saw2.type = 'sawtooth';
inverter.gain.value = -1;

saw1.connect(mixer);
saw2.connect(inverter).connect(mixer);

// Adjust pulse width by changing relative levels
```

**Characteristics:**
- Variable harmonic content based on width
- 50% duty cycle = square wave
- Narrow pulses = nasal, thin
- Wide pulses = fuller sound

### Custom Waveforms (PeriodicWave)
```typescript
const real = new Float32Array([0, 0.5, 0.3, 0.1]); // Cosine coefficients
const imag = new Float32Array(real.length);        // Sine coefficients
const wave = context.createPeriodicWave(real, imag, {disableNormalization: false});
oscillator.setPeriodicWave(wave);
```

**Use Cases:**
- Organ registrations (additive synthesis)
- Unique timbres not available in standard waveforms
- Harmonic-rich drones
- Preset waveform banks

### Wavetable Synthesis
Store multiple waveforms and crossfade between them:

```typescript
class WavetableOscillator {
  private wavetables: PeriodicWave[] = [];
  private currentOscillator: OscillatorNode;
  
  morphTo(index: number, crossfadeTime: number = 0.1): void {
    const newOsc = this.context.createOscillator();
    newOsc.setPeriodicWave(this.wavetables[index]);
    
    // Crossfade logic
    // ...stop old oscillator after crossfade
  }
}
```

## Oscillator Combinations

### Unison (Fat Sound)
Stack multiple oscillators with slight detune:
```typescript
const oscillators = [];
const detunes = [-10, -5, 0, 5, 10]; // Cents

detunes.forEach(detune => {
  const osc = context.createOscillator();
  osc.detune.value = detune;
  oscillators.push(osc);
});
```

**Guidelines:**
- 2-7 oscillators typical
- Detune range: ±5 to ±25 cents
- Divide total gain by number of oscillators

### Octave Stacking
Mix oscillators at different octave intervals:
```typescript
const fundamentalFreq = 440;
const octaves = [0, 1, 2]; // 0 = unison, 1 = +1 octave, 2 = +2 octaves

octaves.forEach((octave, i) => {
  const osc = context.createOscillator();
  osc.frequency.value = fundamentalFreq * Math.pow(2, octave);
  osc.type = i === 0 ? 'sawtooth' : 'sine'; // Fundamental saw, higher octaves sine
});
```

### Subharmonics
Add oscillator an octave (or two) below fundamental:
```typescript
const sub = context.createOscillator();
sub.frequency.value = fundamental / 2; // One octave down
sub.type = 'sine'; // Usually pure sine for clean bass
```

## Waveform Characteristics Table

| Waveform | Harmonics | Brightness | Timbre | Best For |
|----------|-----------|------------|--------|----------|
| Sine | 1st only | Dark | Pure, soft | Sub-bass, LFO, FM |
| Triangle | Odd, 1/n² | Medium-Dark | Mellow, flute-like | Pads, soft leads |
| Sawtooth | All, 1/n | Bright | Buzzy, rich | Leads, brass, bass |
| Square | Odd, 1/n | Bright | Hollow, woody | Retro, clarinet |
| Pulse (narrow) | Complex | Very bright | Nasal, thin | Special FX, tonal variation |

## Frequency Considerations

### Aliasing
High-frequency harmonics can alias (fold back) when they exceed Nyquist frequency (sampleRate/2).

**Mitigation:**
- Use band-limited waveforms (Web Audio handles this)
- Avoid extreme high-frequency oscillators
- Filter high frequencies before distortion

### Pitch Stability
```typescript
// ❌ Unstable: Setting frequency repeatedly
oscillator.frequency.value = newFreq;

// ✅ Stable: Using detune for fine adjustments
oscillator.frequency.value = baseFreq;
oscillator.detune.value = cents; // ±1200 cents = ±1 octave
```

### Frequency Modulation (FM)
Connect one oscillator's output to another's frequency parameter:
```typescript
const modulator = context.createOscillator();
const modulatorGain = context.createGain();
const carrier = context.createOscillator();

modulator.frequency.value = 5; // 5 Hz modulation
modulatorGain.gain.value = 50; // ±50 Hz deviation

modulator.connect(modulatorGain).connect(carrier.frequency);
```

**Ratio Guidelines:**
- Integer ratios (1:2, 2:3) = harmonic
- Non-integer ratios = inharmonic, metallic
- Modulation depth = timbre brightness

## Performance Tips

1. **Reuse oscillators** when possible (change frequency, don't recreate)
2. **Limit simultaneous oscillators** (each voice × oscillators per voice)
3. **Use efficient waveforms** (sine cheapest, custom most expensive)
4. **Pre-calculate frequencies** (store in lookup table for MIDI notes)
5. **Disable unused oscillators** (disconnect and nullify references)

## Common Recipes

### Classic Analog Lead
- 2 sawtooth oscillators, detuned ±7 cents
- Lowpass filter with moderate resonance
- Fast attack, medium release envelope

### Deep Sub Bass
- 1 sine wave at fundamental
- 1 sawtooth wave one octave up
- Lowpass filter at 200-400 Hz
- No resonance

### Warm Pad
- 3-4 triangle or sine waves
- Detuned ±10-15 cents
- Slow attack, long release
- Chorus or ensemble effect

### 8-bit Retro
- Single square wave
- No filter or simple lowpass
- Fast attack, short release
- Optional bit-crushing effect
