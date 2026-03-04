# DSP Fundamentals for Audio Synthesis

Core digital signal processing concepts essential for audio programming.

## Sample Rate & Nyquist Theorem

### Sample Rate

**Definition:** Number of audio samples per second (Hz)

**Common Rates:**
- 44100 Hz (CD quality, most common for Web Audio)
- 48000 Hz (professional audio, video)
- 96000 Hz (high-resolution audio)

**Web Audio:**
```typescript
const context = new AudioContext();
console.log(context.sampleRate); // Usually 44100 or 48000
```

**Note:** Sample rate is fixed by hardware/OS, cannot be changed after context creation.

### Nyquist Frequency

**Definition:** Half the sample rate (highest frequency that can be accurately represented)

```typescript
const nyquistFreq = context.sampleRate / 2; // Usually 22050 Hz
```

**Nyquist Theorem:** Any frequency above Nyquist will **alias** (fold back into audible range).

**Example at 44100 Hz:**
- 22050 Hz: Reproduced accurately (at Nyquist)
- 22100 Hz: Aliases to 22000 Hz (folds back)
- 25000 Hz: Aliases to 19100 Hz (44100 - 25000)

### Aliasing

**What it is:** High frequencies above Nyquist appear as lower frequencies (artifacts)

**Causes:**
- Generating frequencies > Nyquist
- Distortion/waveshaping (creates harmonics)
- Sample rate conversion
- Ring modulation

**Prevention:**
1. **Band-limited oscillators** (Web Audio handles this automatically)
2. **Oversampling** for distortion/waveshaping
3. **Low-pass filtering** before sample rate reduction

**Example - Oversampling for Waveshaper:**
```typescript
waveshaper.oversample = '4x'; // 2x, 4x, or none
```

Oversampling:
1. Upsamples to 4× sample rate (176400 Hz)
2. Applies waveshaping
3. Low-pass filters and downsamples back to 44100 Hz
4. Result: Reduces aliasing artifacts from distortion

## Bit Depth & Dynamic Range

### Bit Depth

**Definition:** Number of bits used to represent each sample's amplitude

**Common Depths:**
- 16-bit: CD quality (96 dB dynamic range)
- 24-bit: Professional audio (144 dB dynamic range)
- 32-bit float: Web Audio API (essentially unlimited for intermediate processing)

**Dynamic Range:**
```
Dynamic Range = 6.02 × bit depth (in dB)
```

- 16-bit: ~96 dB
- 24-bit: ~144 dB

**Web Audio:** Uses 32-bit float internally, so don't worry about bit depth for processing.

### Quantization Noise

**What it is:** Error introduced by rounding continuous values to discrete bit levels

**Audible:** Only at very low bit depths (< 8 bits)

**Solution:** Dithering (adding tiny amounts of noise to randomize quantization error)

## Frequency & Pitch

### Frequency to MIDI Note Conversion

```typescript
function freqToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440);
}

// Example
freqToMidi(440);  // 69 (A4)
freqToMidi(880);  // 81 (A5)
freqToMidi(220);  // 57 (A3)
```

### MIDI Note to Frequency

```typescript
function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

// Example
midiToFreq(69);  // 440.0 (A4)
midiToFreq(60);  // 261.63 (C4, middle C)
midiToFreq(72);  // 523.25 (C5)
```

### Cents (Fine Tuning)

**Definition:** 1/100th of a semitone (1200 cents = 1 octave)

```typescript
function centsToRatio(cents: number): number {
  return Math.pow(2, cents / 1200);
}

function ratioToCents(ratio: number): number {
  return 1200 * Math.log2(ratio);
}

// Apply cents detune
const detuned = baseFreq * centsToRatio(7); // +7 cents
oscillator.detune.value = cents; // Web Audio convenience
```

**Common Uses:**
- Chorus/Unison: ±5 to ±25 cents
- Microtonal music: Non-12TET tunings
- Analog drift simulation: ±1 to ±3 cents per oscillator

## Decibels (dB)

### Amplitude to dB

```typescript
function gainToDB(gain: number): number {
  return 20 * Math.log10(gain);
}

// Examples
gainToDB(1.0);   // 0 dB (unity gain)
gainToDB(0.5);   // -6.02 dB (half amplitude)
gainToDB(2.0);   // +6.02 dB (double amplitude)
gainToDB(0.1);   // -20 dB
gainToDB(0.0);   // -Infinity (silence)
```

### dB to Amplitude

```typescript
function dbToGain(dB: number): number {
  return Math.pow(10, dB / 20);
}

// Examples
dbToGain(0);     // 1.0 (unity)
dbToGain(-6);    // 0.501 (half volume)
dbToGain(6);     // 1.995 (double volume)
dbToGain(-20);   // 0.1
dbToGain(-60);   // 0.001 (almost silence)
```

### Why dB?

1. **Matches human perception** (logarithmic)
2. **Easier to work with large ranges** (-60dB to +12dB vs 0.001 to 4.0)
3. **Industry standard** for audio levels

**Common dB Values:**
- 0 dB: Unity gain (no change)
- -6 dB: Perceived as "half volume"
- -12 dB: Quarter amplitude
- -∞ dB: Silence (gain = 0)
- +6 dB: Perceived as "twice as loud"

## Time & Rhythm

### BPM to Time Conversion

```typescript
function bpmToSeconds(bpm: number, noteValue: number = 0.25): number {
  // noteValue: 1 = whole, 0.5 = half, 0.25 = quarter, etc.
  return (60 / bpm) * (4 * noteValue);
}

// Examples
bpmToSeconds(120, 0.25);  // 0.5 seconds (quarter note at 120 BPM)
bpmToSeconds(120, 0.125); // 0.25 seconds (eighth note at 120 BPM)
bpmToSeconds(140, 1.0);   // 1.714 seconds (whole note at 140 BPM)
```

### Note Duration Table (at 120 BPM)

| Note | Value | Seconds |
|------|-------|---------|
| Whole | 1.0 | 2.0 |
| Half | 0.5 | 1.0 |
| Quarter | 0.25 | 0.5 |
| Eighth | 0.125 | 0.25 |
| Sixteenth | 0.0625 | 0.125 |
| Dotted Quarter | 0.375 | 0.75 |
| Triplet Eighth | 0.0833 | 0.167 |

## Waveform Mathematics

### Sine Wave

```typescript
// Generate one period of sine wave
const samples = 1024;
const sineWave = new Float32Array(samples);
for (let i = 0; i < samples; i++) {
  sineWave[i] = Math.sin((2 * Math.PI * i) / samples);
}
```

**Harmonics:** Only fundamental (single frequency)

### Sawtooth Wave (Fourier Series)

```
saw(t) = (2/π) × Σ((-1)^(n+1) × sin(2πnft) / n)
```

Where n = 1, 2, 3, 4, ... (all harmonics)

**Harmonics:** All harmonics with amplitude 1/n

### Square Wave (Fourier Series)

```
square(t) = (4/π) × Σ(sin(2π(2n-1)ft) / (2n-1))
```

Where n = 1, 2, 3, ... (odd harmonics only)

**Harmonics:** Odd harmonics only with amplitude 1/n

### Triangle Wave (Fourier Series)

```
triangle(t) = (8/π²) × Σ((-1)^n × sin(2π(2n-1)ft) / (2n-1)²)
```

**Harmonics:** Odd harmonics with amplitude 1/n²

## Filter Mathematics

### Biquad Filter Transfer Function

```
H(z) = (b0 + b1×z^(-1) + b2×z^(-2)) / (a0 + a1×z^(-1) + a2×z^(-2))
```

Web Audio `BiquadFilterNode` implements this automatically.

### Quality Factor (Q)

```
Q = centerFrequency / bandwidth
```

**Higher Q:**
- Narrower bandwidth
- Sharper resonance peak
- More "ringing"

**Lower Q:**
- Wider bandwidth
- Gentler rolloff
- More natural sound

### Cutoff Frequency

**-3dB point:** Frequency where signal is reduced to 70.7% (-3dB) of original amplitude

Most filters specify cutoff at -3dB point.

## Envelopes

### ADSR Timing

```
Total Time = Attack + Decay + Sustain Duration + Release
```

**Attack:** 0 → peak (typically 0.001 - 2.0 seconds)  
**Decay:** peak → sustain level (typically 0.01 - 1.0 seconds)  
**Sustain:** Hold at level (duration determined by note length)  
**Release:** sustain → 0 (typically 0.01 - 5.0 seconds)

### Exponential vs Linear

**Linear Ramp:**
```typescript
param.linearRampToValueAtTime(target, time);
```
- Constant rate of change
- Good for: Pitch sweeps

**Exponential Ramp:**
```typescript
param.exponentialRampToValueAtTime(target, time);
```
- Percentage-based change
- Good for: Amplitude, frequency (sounds more natural)
- **Cannot ramp to 0** (use 0.001 instead)

**Why exponential sounds better:**
- Human perception is logarithmic
- Natural decay (sound physics)
- Professional sound quality

## Latency & Timing

### Audio Context Time

```typescript
const now = context.currentTime; // In seconds, high precision
```

**Always use** `context.currentTime` for scheduling, not `Date.now()` or `performance.now()`.

**Why?**
- Synchronized with audio rendering
- Sub-millisecond precision
- Compensates for latency

### Scheduling Ahead

```typescript
// ❌ Bad: Schedule in the past
oscillator.start(context.currentTime);

// ✅ Good: Schedule slightly ahead
oscillator.start(context.currentTime + 0.001);
```

**Buffer ahead:** 10-50ms typical for real-time interactive apps

### Latency Sources

1. **Hardware buffering:** 5-20ms (USB audio interfaces)
2. **OS audio system:** 10-50ms (varies by platform)
3. **Web Audio buffering:** ~3-10ms
4. **Total round-trip:** 20-100ms typical

**Reducing latency:**
- Use ASIO drivers (Windows)
- Lower buffer sizes (trade-off: CPU usage)
- Use AudioContext with low latency hint (future Web Audio feature)

## Signal Flow & Gain Staging

### Gain Staging

**Principle:** Keep signal levels optimal throughout processing chain

```
Input → [0 to -6dB] → Processing → [0 to -6dB] → Output
```

**Avoid:**
- Clipping (> 1.0, causes distortion)
- Too quiet (< 0.01, loses resolution)

**Sum of voices:**
```typescript
const voiceCount = 8;
const perVoiceGain = 1 / voiceCount; // 0.125 for 8 voices
// Prevents clipping when all voices play
```

### Headroom

**Definition:** Space between loudest peak and clipping point (0 dB)

**Typical:** -6dB to -12dB headroom

```typescript
const masterGain = context.createGain();
masterGain.gain.value = dbToGain(-6); // -6dB headroom
```

## Performance Optimization

### Node Creation Cost

**Expensive (avoid creating per note):**
- ConvolverNode (reverb)
- Complex filter cascades
- WaveShaperNode with custom curves

**Cheap (okay to create per note):**
- OscillatorNode
- GainNode
- Simple BiquadFilterNode

### Buffer Size

Larger buffers = lower CPU, higher latency  
Smaller buffers = higher CPU, lower latency

**Web Audio:** Managed automatically, but can affect performance on low-end devices.

### Voice Limiting

```typescript
const MAX_VOICES = 32; // Typical limit

if (activeVoices.size >= MAX_VOICES) {
  const oldestVoice = findOldestVoice();
  stopVoice(oldestVoice); // Voice stealing
}
```

## Common DSP Formulas

### Linear Interpolation

```typescript
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Smooth parameter changes
const newValue = lerp(currentValue, targetValue, 0.1);
```

### Clamp (Limit Range)

```typescript
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Prevent out-of-range values
const safeGain = clamp(userInput, 0, 1);
```

### Normalization

```typescript
function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

// Convert range to 0-1
const normalized = normalize(frequency, 20, 20000);
```

### Moving Average (Smoothing)

```typescript
class Smoother {
  private history: number[] = [];
  
  constructor(private size: number) {}
  
  process(value: number): number {
    this.history.push(value);
    if (this.history.length > this.size) {
      this.history.shift();
    }
    return this.history.reduce((a, b) => a + b) / this.history.length;
  }
}

// Smooth control values
const smoother = new Smoother(10);
const smoothedValue = smoother.process(rawValue);
```

## Anti-Aliasing Techniques

### Oversampling (Waveshaping)

```typescript
waveshaper.oversample = '4x'; // None, 2x, or 4x
```

**Trade-off:** Better quality, higher CPU cost

### Band-Limited Waveforms

Web Audio oscillators are band-limited by default (antialiased).

**Manual implementation (PolyBLEP for custom waveforms):**
- Complex algorithm
- Reduces discontinuities at waveform transitions
- Required for custom oscillators

### Pre-Filtering

Before operations that create harmonics:
```typescript
// Low-pass filter before distortion
input → lowpass(8kHz) → distortion → output
```

Prevents high-frequency content from aliasing.

## Debugging Audio Issues

### Check Signal Flow

```typescript
// Insert gain node to test signal path
const testGain = context.createGain();
testGain.gain.value = 1;
suspectedSource.connect(testGain).connect(destination);

// If sound appears, source is active
```

### Monitor Levels

```typescript
const analyser = context.createAnalyser();
source.connect(analyser);

const dataArray = new Uint8Array(analyser.fftSize);
analyser.getByteTimeDomainData(dataArray);

// Check if dataArray has non-128 values (128 = silence in unsigned byte)
const hasSignal = dataArray.some(v => v !== 128);
```

### Check Context State

```typescript
console.log(context.state); // 'suspended', 'running', 'closed'

if (context.state === 'suspended') {
  context.resume(); // Required after user interaction
}
```

### Verify Scheduling

```typescript
// Check if scheduled time is in the past
const now = context.currentTime;
const scheduledTime = now + 0.1;

oscillator.start(scheduledTime);
// If scheduledTime < now, won't play
```

## Reference Values

### Equal Temperament Frequencies

| Note | MIDI | Frequency (Hz) |
|------|------|----------------|
| C4 (Middle C) | 60 | 261.63 |
| A4 (Concert Pitch) | 69 | 440.00 |
| C5 | 72 | 523.25 |
| A5 | 81 | 880.00 |

### Musical Intervals (Frequency Ratios)

| Interval | Ratio | Semitones |
|----------|-------|-----------|
| Unison | 1:1 | 0 |
| Minor 2nd | 16:15 | 1 |
| Major 2nd | 9:8 | 2 |
| Minor 3rd | 6:5 | 3 |
| Major 3rd | 5:4 | 4 |
| Perfect 4th | 4:3 | 5 |
| Tritone | 45:32 | 6 |
| Perfect 5th | 3:2 | 7 |
| Octave | 2:1 | 12 |

### Standard Tunings

- **A440:** Modern standard (A4 = 440 Hz)
- **A432:** Alternative tuning (A4 = 432 Hz)
- **A415:** Baroque pitch (A4 = 415 Hz)

```typescript
function setTuning(baseFreq: number = 440): number {
  const a4midi = 69;
  return (note: number) => baseFreq * Math.pow(2, (note - a4midi) / 12);
}

const a432 = setTuning(432);
console.log(a432(60)); // C4 at A432 tuning
```
