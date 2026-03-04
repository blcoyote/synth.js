# Filter Design & Implementation

## BiquadFilterNode Types

Web Audio provides `BiquadFilterNode` with multiple filter types. Each has unique frequency response characteristics.

### Lowpass Filter

**Purpose:** Removes high frequencies, retains lows  
**Use Cases:** Warmth, muffled sounds, analog-style sweeps

**Parameters:**
```typescript
filter.type = 'lowpass';
filter.frequency.value = 1000;  // Cutoff (Hz): 20-20000
filter.Q.value = 1;             // Resonance: 0.0001-1000
```

**Q (Resonance) Effects:**
- Q < 0.7: Gentle rolloff, natural sound
- Q = 0.7071: Butterworth (maximally flat)
- Q = 1-5: Slight emphasis at cutoff
- Q = 5-20: Self-resonance, "singing" filter
- Q > 20: Extreme resonance, can self-oscillate

**Slope:** -12dB/octave (2-pole)

**Sound Character:**
- Low Q: Subtle high-frequency damping
- High Q: Classic analog synth "wah"
- Sweep from low to high: Opening effect

### Highpass Filter

**Purpose:** Removes low frequencies, retains highs  
**Use Cases:** Thinning sound, removing mud, telephone effect

**Parameters:**
```typescript
filter.type = 'highpass';
filter.frequency.value = 200;   // Cutoff (Hz): 20-20000
filter.Q.value = 1;             // Resonance: 0.0001-1000
```

**Slope:** -12dB/octave (2-pole)

**Sound Character:**
- Low cutoff (20-100 Hz): Remove sub-bass rumble
- Mid cutoff (200-500 Hz): Thin, tinny
- High cutoff (1000+ Hz): Extreme thinning, sibilance only

### Bandpass Filter

**Purpose:** Retains only frequencies near center, removes lows and highs  
**Use Cases:** Vocal formants, telephone/radio effects, resonant sweeps

**Parameters:**
```typescript
filter.type = 'bandpass';
filter.frequency.value = 1000;  // Center frequency (Hz)
filter.Q.value = 10;            // Bandwidth control (higher = narrower)
```

**Q Effects:**
- Q = 1: Very wide band (almost full spectrum)
- Q = 5-10: Musical "wah" effect
- Q = 20-50: Narrow resonance, whistling
- Q > 50: Extreme resonance, tuned pitch

**Bandwidth Calculation:**
```typescript
const bandwidth = frequency / Q; // Approximate -3dB bandwidth in Hz
```

**Sound Character:**
- Vocal formant simulation
- "Talking" instruments
- Dramatic filter sweeps

### Notch (Band-Reject) Filter

**Purpose:** Removes frequencies near center, retains lows and highs  
**Use Cases:** Remove specific frequencies (hum, resonance), phaser effects

**Parameters:**
```typescript
filter.type = 'notch';
filter.frequency.value = 1000;  // Center frequency to remove
filter.Q.value = 10;            // Notch width (higher = narrower notch)
```

**Sound Character:**
- Opposite of bandpass
- Creates "hollow" sound
- Useful for removing problem frequencies

### Allpass Filter

**Purpose:** Shifts phase without changing gain  
**Use Cases:** Phaser effects, spatial processing, delay network tuning

**Parameters:**
```typescript
filter.type = 'allpass';
filter.frequency.value = 1000;  // Phase shift center
filter.Q.value = 1;             // Sharpness of phase transition
```

**Key Point:** Allpass doesn't change volume at any frequency, only phase relationships.

**Sound Character:**
- Alone: Barely audible difference
- Combined with dry signal: Comb filtering (phaser)
- In series: Complex phase effects

### Peaking (Parametric EQ)

**Purpose:** Boost or cut at specific frequency  
**Use Cases:** EQ, surgical frequency adjustment, formant synthesis

**Parameters:**
```typescript
filter.type = 'peaking';
filter.frequency.value = 1000;  // Center frequency
filter.Q.value = 5;             // Bandwidth (higher = narrower)
filter.gain.value = 6;          // Boost/cut in dB (-40 to +40)
```

**Sound Character:**
- Positive gain: Boost (emphasize)
- Negative gain: Cut (reduce)
- Narrow Q: Surgical adjustment
- Wide Q: Musical tonal shaping

### Lowshelf Filter

**Purpose:** Boost or cut all frequencies below frequency  
**Use Cases:** Bass boost/cut, tonal shaping

**Parameters:**
```typescript
filter.type = 'lowshelf';
filter.frequency.value = 200;   // Transition frequency
filter.gain.value = 6;          // Boost/cut in dB
```

**Sound Character:**
- Boost: Adds weight, warmth
- Cut: Reduces muddiness, rumble

### Highshelf Filter

**Purpose:** Boost or cut all frequencies above frequency  
**Use Cases:** Brightness control, air, de-essing

**Parameters:**
```typescript
filter.type = 'highshelf';
filter.frequency.value = 5000;  // Transition frequency
filter.gain.value = -3;         // Boost/cut in dB
```

**Sound Character:**
- Boost: Adds brightness, air, presence
- Cut: Dulls, removes harshness

## Filter Design Patterns

### Cascading Filters (Steeper Slopes)

Stack multiple filters for steeper rolloff:
```typescript
const lp1 = context.createBiquadFilter();
const lp2 = context.createBiquadFilter();

lp1.type = lp2.type = 'lowpass';
lp1.frequency.value = lp2.frequency.value = 1000;
lp1.Q.value = lp2.Q.value = 0.7071; // Butterworth

input.connect(lp1).connect(lp2).connect(output);
```

**Results:**
- 2× lowpass = -24dB/octave (4-pole, Moog-style)
- 3× lowpass = -36dB/octave (rare, very steep)
- Same for highpass

**Note:** Adjust Q values to avoid unnatural resonance bumps at cutoff.

### State Variable Filter (Multimode)

Provide simultaneous lowpass, highpass, and bandpass outputs:
```typescript
class StateVariableFilter {
  private lpFilter: BiquadFilterNode;
  private hpFilter: BiquadFilterNode;
  private bpFilter: BiquadFilterNode;
  
  constructor(context: AudioContext) {
    // Configure all three types at same frequency
    this.lpFilter = context.createBiquadFilter();
    this.hpFilter = context.createBiquadFilter();
    this.bpFilter = context.createBiquadFilter();
    
    this.lpFilter.type = 'lowpass';
    this.hpFilter.type = 'highpass';
    this.bpFilter.type = 'bandpass';
  }
  
  setFrequency(freq: number): void {
    this.lpFilter.frequency.value = freq;
    this.hpFilter.frequency.value = freq;
    this.bpFilter.frequency.value = freq;
  }
}
```

### Formant Filter (Vocal Simulation)

Stack multiple peaking filters at vowel formant frequencies:
```typescript
// Simulate "ah" vowel
const formants = [
  { freq: 800, Q: 10, gain: 6 },   // F1
  { freq: 1200, Q: 15, gain: 3 },  // F2
  { freq: 2600, Q: 20, gain: -3 }, // F3
];

formants.forEach(({freq, Q, gain}) => {
  const filter = context.createBiquadFilter();
  filter.type = 'peaking';
  filter.frequency.value = freq;
  filter.Q.value = Q;
  filter.gain.value = gain;
  // Chain them together
});
```

**Vowel Formants (approximate):**
- "ah": 800, 1200, 2600 Hz
- "eh": 500, 1800, 2500 Hz
- "ee": 300, 2300, 3000 Hz
- "oh": 400, 800, 2600 Hz
- "oo": 300, 600, 2400 Hz

## Frequency Scaling for UI

Filters sound best with **logarithmic** frequency control:

```typescript
// Convert linear slider (0-1) to logarithmic frequency
function sliderToFreq(value: number, min = 20, max = 20000): number {
  const minLog = Math.log(min);
  const maxLog = Math.log(max);
  return Math.exp(minLog + value * (maxLog - minLog));
}

// Convert frequency to linear slider value
function freqToSlider(freq: number, min = 20, max = 20000): number {
  const minLog = Math.log(min);
  const maxLog = Math.log(max);
  return (Math.log(freq) - minLog) / (maxLog - minLog);
}
```

**Why logarithmic?**
- Human hearing is logarithmic (octaves)
- Linear slider feels uneven (crowded at high end)
- Musical intervals are logarithmic

## Envelope Modulation

Apply envelope to filter cutoff for dynamic timbre:

```typescript
class FilterEnvelope {
  constructor(
    private filter: BiquadFilterNode,
    private baseFreq: number,
    private envAmount: number, // How much envelope affects cutoff
    private attack: number,
    private decay: number,
    private sustain: number,
    private release: number
  ) {}
  
  trigger(time: number): void {
    const freq = this.filter.frequency;
    const peak = this.baseFreq + this.envAmount;
    const sustainFreq = this.baseFreq + (this.envAmount * this.sustain);
    
    freq.cancelScheduledValues(time);
    freq.setValueAtTime(this.baseFreq, time);
    freq.exponentialRampToValueAtTime(peak, time + this.attack);
    freq.exponentialRampToValueAtTime(sustainFreq, time + this.attack + this.decay);
  }
  
  release(time: number): void {
    const freq = this.filter.frequency;
    freq.cancelScheduledValues(time);
    freq.setValueAtTime(freq.value, time);
    freq.exponentialRampToValueAtTime(this.baseFreq, time + this.release);
  }
}
```

**Common Patterns:**
- Pluck: Fast attack, fast decay to low sustain
- Sweep: Slow attack, long decay
- Static: No envelope (sustain = 1.0)

## LFO Modulation

Automate filter cutoff with LFO for cyclical sweeps:

```typescript
const lfo = context.createOscillator();
const lfoGain = context.createGain();

lfo.frequency.value = 0.5; // 0.5 Hz = once every 2 seconds
lfoGain.gain.value = 500;  // ±500 Hz deviation

lfo.connect(lfoGain).connect(filter.frequency);
lfo.start();
```

**LFO Rate Guidelines:**
- 0.1-2 Hz: Slow sweeps, evolving pads
- 2-8 Hz: Rhythmic wah effect
- 8-20 Hz: Tremolo-like modulation
- 20+ Hz: Audio rate FM (creates sidebands)

## Resonance Self-Oscillation

At very high Q, filters can self-oscillate (produce tone even without input):

```typescript
filter.Q.value = 100; // Will generate sine wave at cutoff frequency
filter.frequency.value = 440; // Generates A4 note
```

**Uses:**
- Additional oscillator source
- Kick drum "click"
- Sci-fi effects

**Caution:** Can be very loud! Reduce filter input gain.

## Filter Comparison Table

| Type | Removes | Retains | Slope | Musical Use |
|------|---------|---------|-------|-------------|
| Lowpass | Highs | Lows | -12dB/oct | Warmth, classic synth |
| Highpass | Lows | Highs | -12dB/oct | Thin, bright, no mud |
| Bandpass | Lows+Highs | Center | -12dB/oct both sides | Vocal, wah, resonant |
| Notch | Center | Lows+Highs | -12dB/oct | Remove hum, phasing |
| Allpass | Nothing | Everything | N/A | Phase effects only |
| Peaking | Nothing | Everything | +/- at center | EQ, formants |
| Lowshelf | Nothing | Everything | Boost/cut lows | Bass control |
| Highshelf | Nothing | Everything | Boost/cut highs | Brightness control |

## Common Recipes

### Moog-Style Lowpass (24dB/oct)
```typescript
const lp1 = context.createBiquadFilter();
const lp2 = context.createBiquadFilter();
lp1.type = lp2.type = 'lowpass';
lp1.frequency.value = lp2.frequency.value = 800;
lp1.Q.value = lp2.Q.value = 3; // Slight resonance
input.connect(lp1).connect(lp2).connect(output);
```

### Classic Analog Wah
```typescript
filter.type = 'bandpass';
filter.frequency.value = 1000; // Sweep 200-3000 Hz
filter.Q.value = 10; // High resonance
// Modulate frequency with LFO or envelope
```

### Telephone/Radio Effect
```typescript
const hp = context.createBiquadFilter();
const lp = context.createBiquadFilter();
hp.type = 'highpass';
hp.frequency.value = 300;
lp.type = 'lowpass';
lp.frequency.value = 3000;
input.connect(hp).connect(lp).connect(output);
```

### Phaser (using Allpass)
```typescript
const allpass1 = context.createBiquadFilter();
const allpass2 = context.createBiquadFilter();
const mixer = context.createGain();

allpass1.type = allpass2.type = 'allpass';
allpass1.frequency.value = 1000; // Modulate with LFO
allpass2.frequency.value = 2000;

// Mix dry and processed signals
input.connect(mixer); // Dry
input.connect(allpass1).connect(allpass2).connect(mixer); // Wet
```

## Performance Considerations

1. **Limit filter count:** Each biquad has CPU cost
2. **Avoid extreme Q values in production:** Can cause numerical instability
3. **Use frequency.setTargetAtTime():** Smoother than direct value assignment
4. **Pre-calculate filter chains:** Don't create/destroy filters per note
5. **Share filters when possible:** One filter can process multiple voices (but loses per-voice control)
