# Modulation Routing & Implementation

Advanced patterns for connecting modulators (LFOs, envelopes) to synthesis parameters.

## Modulation Fundamentals

**Modulation** = automated parameter changes over time

**Modulators:**
- **LFO**: Cyclical, periodic modulation
- **Envelope**: Triggered, one-shot modulation
- **Step Sequencer**: Discrete, rhythmic modulation
- **Random**: Non-periodic, chaotic modulation

**Targets:**
- Oscillator frequency (vibrato, pitch sweep)
- Filter cutoff (wah, filter sweep)
- Gain (tremolo, amplitude envelope)
- Pan (auto-pan, stereo movement)
- Effect parameters (animated effects)

## LFO Implementation

### Basic LFO

```typescript
export class LFO {
  private oscillator: OscillatorNode;
  private gainNode: GainNode;
  private running = false;
  
  constructor(
    private context: AudioContext,
    private frequency: number = 1,
    private depth: number = 100,
    private waveform: OscillatorType = 'sine'
  ) {
    this.oscillator = context.createOscillator();
    this.gainNode = context.createGain();
    
    this.oscillator.type = waveform;
    this.oscillator.frequency.value = frequency;
    this.gainNode.gain.value = depth;
    
    this.oscillator.connect(this.gainNode);
  }
  
  connect(destination: AudioParam): void {
    this.gainNode.connect(destination);
  }
  
  start(): void {
    if (!this.running) {
      this.oscillator.start();
      this.running = true;
    }
  }
  
  stop(): void {
    if (this.running) {
      this.oscillator.stop();
      this.running = false;
    }
  }
  
  setFrequency(freq: number): void {
    this.oscillator.frequency.value = freq;
  }
  
  setDepth(depth: number): void {
    this.gainNode.gain.value = depth;
  }
  
  setWaveform(type: OscillatorType): void {
    // Note: Changing waveform requires recreating oscillator
    const wasRunning = this.running;
    if (wasRunning) this.stop();
    
    this.oscillator = this.context.createOscillator();
    this.oscillator.type = type;
    this.oscillator.frequency.value = this.frequency;
    
    if (wasRunning) this.start();
  }
}
```

### LFO Waveforms & Effects

| Waveform | Movement | Use Case |
|----------|----------|----------|
| Sine | Smooth, circular | Natural vibrato, subtle modulation |
| Triangle | Linear, smooth | Geometric sweeps, predictable |
| Square | Stepped, abrupt | Rhythmic toggling, trill effects |
| Sawtooth | Rising ramp | Upward sweeps, ascending motion |
| Reverse Saw | Falling ramp | Downward sweeps, descending motion |

### Multi-Target LFO

Single LFO modulating multiple parameters:

```typescript
export class MultiTargetLFO extends LFO {
  private targets = new Map<AudioParam, number>(); // param → depth
  
  addTarget(param: AudioParam, depth: number): void {
    const scaleNode = this.context.createGain();
    scaleNode.gain.value = depth;
    
    this.gainNode.connect(scaleNode);
    scaleNode.connect(param);
    
    this.targets.set(param, depth);
  }
  
  removeTarget(param: AudioParam): void {
    this.targets.delete(param);
    // Disconnect logic...
  }
  
  setTargetDepth(param: AudioParam, depth: number): void {
    const existingDepth = this.targets.get(param);
    if (existingDepth !== undefined) {
      // Update scaling
      this.targets.set(param, depth);
    }
  }
}
```

**Use Cases:**
- Single LFO → filter cutoff + oscillator pitch (synchronized movement)
- Single LFO → multiple effect parameters (unified animation)
- Single LFO → stereo pan L/R (inverted depths for stereo width)

## Depth & Offset Pattern

LFO oscillates around 0. To modulate a parameter that needs a specific range, use offset + depth:

```typescript
class RangedLFO {
  private lfo: OscillatorNode;
  private depthGain: GainNode;
  private offsetNode: ConstantSourceNode;
  private mixer: GainNode;
  
  constructor(
    context: AudioContext,
    center: number,    // Center point of modulation
    depth: number,     // ± range from center
    rate: number       // LFO frequency
  ) {
    this.lfo = context.createOscillator();
    this.depthGain = context.createGain();
    this.offsetNode = context.createConstantSource();
    this.mixer = context.createGain();
    
    this.lfo.frequency.value = rate;
    this.depthGain.gain.value = depth;
    this.offsetNode.offset.value = center;
    
    // LFO with depth
    this.lfo.connect(this.depthGain);
    
    // Combine offset + modulated signal
    this.depthGain.connect(this.mixer);
    this.offsetNode.connect(this.mixer);
    
    this.lfo.start();
    this.offsetNode.start();
  }
  
  connect(destination: AudioParam): void {
    this.mixer.connect(destination);
  }
}
```

**Example:** Filter cutoff sweeps from 200Hz to 2000Hz
```typescript
const center = 1100; // Midpoint
const depth = 900;   // ±900 Hz
const lfo = new RangedLFO(context, center, depth, 0.5);
lfo.connect(filter.frequency);
// Result: Sweeps 200Hz (1100-900) to 2000Hz (1100+900)
```

## Envelope as Modulator

### Filter Envelope (EG → Filter Cutoff)

```typescript
export class FilterEnvelope {
  constructor(
    private filter: BiquadFilterNode,
    private baseFrequency: number,
    private envAmount: number, // How far envelope opens filter
    private attack: number,
    private decay: number,
    private sustain: number,
    private release: number
  ) {}
  
  trigger(time: number): void {
    const freq = this.filter.frequency;
    const peak = this.baseFrequency + this.envAmount;
    const sustainLevel = this.baseFrequency + (this.envAmount * this.sustain);
    
    freq.cancelScheduledValues(time);
    freq.setValueAtTime(this.baseFrequency, time);
    freq.exponentialRampToValueAtTime(Math.max(peak, 0.001), time + this.attack);
    freq.exponentialRampToValueAtTime(Math.max(sustainLevel, 0.001), time + this.attack + this.decay);
  }
  
  release(time: number): void {
    const freq = this.filter.frequency;
    freq.cancelScheduledValues(time);
    freq.setValueAtTime(freq.value, time);
    freq.exponentialRampToValueAtTime(Math.max(this.baseFrequency, 0.001), time + this.release);
  }
}
```

**Common Settings:**
- **Pluck:** Fast attack (0.01s), fast decay (0.1s), low sustain (0.1)
- **Slow Sweep:** Slow attack (0.5s), medium decay (0.3s), medium sustain (0.5)
- **No Envelope:** Attack + decay = 0, sustain = 1.0 (static)

### Pitch Envelope

```typescript
export class PitchEnvelope {
  constructor(
    private oscillator: OscillatorNode,
    private baseFrequency: number,
    private pitchAmount: number, // In semitones
    private attack: number,
    private decay: number
  ) {}
  
  trigger(time: number): void {
    const freq = this.oscillator.frequency;
    const startFreq = this.baseFrequency * Math.pow(2, this.pitchAmount / 12);
    
    freq.cancelScheduledValues(time);
    freq.setValueAtTime(startFreq, time);
    freq.exponentialRampToValueAtTime(this.baseFrequency, time + this.attack + this.decay);
  }
}
```

**Use Cases:**
- **Kick Drum:** High pitch amount (12-24 semitones), fast decay
- **Toms:** Medium pitch amount (5-10 semitones), medium decay
- **Percussive Attack:** Small pitch amount (1-3 semitones), very fast decay

## Modulation Matrix

Route any modulator to any target with variable depth.

```typescript
interface ModulationRoute {
  source: AudioNode;      // LFO or envelope generator
  destination: AudioParam; // Target parameter
  depth: number;          // Modulation amount
  scaleNode: GainNode;    // Depth control
}

export class ModulationMatrix {
  private routes: ModulationRoute[] = [];
  
  constructor(private context: AudioContext) {}
  
  addRoute(
    source: AudioNode,
    destination: AudioParam,
    depth: number
  ): void {
    const scaleNode = this.context.createGain();
    scaleNode.gain.value = depth;
    
    source.connect(scaleNode);
    scaleNode.connect(destination);
    
    this.routes.push({ source, destination, depth, scaleNode });
  }
  
  setRouteDepth(
    source: AudioNode,
    destination: AudioParam,
    newDepth: number
  ): void {
    const route = this.routes.find(
      r => r.source === source && r.destination === destination
    );
    
    if (route) {
      route.scaleNode.gain.value = newDepth;
      route.depth = newDepth;
    }
  }
  
  removeRoute(source: AudioNode, destination: AudioParam): void {
    const index = this.routes.findIndex(
      r => r.source === source && r.destination === destination
    );
    
    if (index !== -1) {
      const route = this.routes[index];
      route.scaleNode.disconnect();
      this.routes.splice(index, 1);
    }
  }
  
  getRoutes(): ModulationRoute[] {
    return this.routes;
  }
}
```

**Usage:**
```typescript
const matrix = new ModulationMatrix(context);

// LFO 1 → Filter Cutoff (depth 500 Hz)
matrix.addRoute(lfo1.output, filter.frequency, 500);

// LFO 2 → Oscillator Pitch (depth 10 Hz for vibrato)
matrix.addRoute(lfo2.output, oscillator.frequency, 10);

// Envelope → Filter Cutoff (depth 2000 Hz)
matrix.addRoute(envelope.output, filter.frequency, 2000);

// Later: Adjust depth
matrix.setRouteDepth(lfo1.output, filter.frequency, 800);
```

## Tempo-Synced LFO

Synchronize LFO rate to musical tempo:

```typescript
export class SyncedLFO extends LFO {
  private bpm = 120;
  private division = 1/4; // Quarter note
  
  constructor(context: AudioContext) {
    super(context, 0, 100); // Frequency set via setBPM
    this.updateFrequency();
  }
  
  setBPM(bpm: number): void {
    this.bpm = bpm;
    this.updateFrequency();
  }
  
  setDivision(division: number): void {
    // 1 = whole note, 1/2 = half, 1/4 = quarter, etc.
    this.division = division;
    this.updateFrequency();
  }
  
  private updateFrequency(): void {
    // BPM is quarter notes per minute
    // Frequency in Hz = (BPM / 60) * (division / 0.25)
    const freq = (this.bpm / 60) * (this.division / 0.25);
    this.setFrequency(freq);
  }
}
```

**Musical Divisions:**
- Whole note: `1`
- Half note: `1/2`
- Quarter note: `1/4`
- Eighth note: `1/8`
- Sixteenth note: `1/16`
- Dotted quarter: `3/8`
- Triplet eighth: `1/12`

## Advanced Modulation Techniques

### Amplitude Modulation (AM)

One oscillator modulates another's amplitude:

```typescript
const carrier = context.createOscillator();
const modulator = context.createOscillator();
const modulatorGain = context.createGain();
const carrierGain = context.createGain();

carrier.frequency.value = 440; // A4
modulator.frequency.value = 5; // 5 Hz tremolo

// Modulate carrier's gain
modulatorGain.gain.value = 0.5; // Depth
carrierGain.gain.value = 0.5;   // DC offset (prevents negative gain)

modulator.connect(modulatorGain).connect(carrierGain.gain);
carrier.connect(carrierGain).connect(destination);
```

**Results:**
- Tremolo effect (rhythmic volume change)
- Sidebands at carrier ± modulator frequency

### Frequency Modulation (FM)

One oscillator modulates another's frequency:

```typescript
const carrier = context.createOscillator();
const modulator = context.createOscillator();
const modulatorGain = context.createGain();

carrier.frequency.value = 440;  // Carrier
modulator.frequency.value = 110; // Modulator (1:4 ratio)

modulatorGain.gain.value = 200; // Modulation index * modulator freq

modulator.connect(modulatorGain).connect(carrier.frequency);
```

**FM Ratios:**
- **Integer (1:2, 2:3, 3:4):** Harmonic, musical
- **Non-integer (1:1.5, 2.3:1):** Inharmonic, bell-like
- **Modulation Index:** Higher = brighter, more sidebands

See [FM-SYNTHESIS.md](../../../../docs/FM-SYNTHESIS.md) for detailed FM patterns.

### Cross-Modulation

Two oscillators modulate each other (feedback FM):

```typescript
const osc1 = context.createOscillator();
const osc2 = context.createOscillator();
const gain1 = context.createGain();
const gain2 = context.createGain();

osc1.frequency.value = 440;
osc2.frequency.value = 660;
gain1.gain.value = 50; // Modulation depth
gain2.gain.value = 50;

osc1.connect(gain1).connect(osc2.frequency);
osc2.connect(gain2).connect(osc1.frequency);
```

**Result:** Complex, evolving timbres (chaotic at high depths)

### Sample & Hold

"Step" quantization of modulation:

```typescript
export class SampleAndHold {
  private random: AudioWorkletNode; // Generates noise
  private clock: OscillatorNode;    // Sample rate
  private lastValue = 0;
  
  constructor(context: AudioContext, sampleRate: number) {
    // Requires custom AudioWorklet for sample & hold logic
    this.clock = context.createOscillator();
    this.clock.frequency.value = sampleRate;
    // Implementation requires AudioWorklet...
  }
}
```

**Use:** Random, stepped modulation (classic analog synth effect)

## Polyphonic Modulation

### Per-Voice Modulation

Each voice has independent modulation:

```typescript
interface Voice {
  oscillator: OscillatorNode;
  filter: BiquadFilterNode;
  envelope: ADSREnvelope;
  filterEnvelope: FilterEnvelope; // Per-voice envelope
}

class VoiceManager {
  noteOn(note: number): void {
    const voice = this.createVoice(note);
    
    // Trigger per-voice envelopes
    voice.envelope.trigger(this.context.currentTime);
    voice.filterEnvelope.trigger(this.context.currentTime);
  }
}
```

### Global Modulation

Single LFO modulates all voices:

```typescript
const globalLFO = new LFO(context, 0.5, 100);

voices.forEach(voice => {
  globalLFO.connect(voice.filter.frequency);
});

globalLFO.start();
```

**Decision:**
- **Per-voice:** More realistic (each note evolves independently)
- **Global:** More efficient (single LFO for all voices)
- **Hybrid:** Envelopes per-voice, LFOs global

## Modulation Performance

### Optimization Tips

1. **Reuse LFOs** across multiple targets instead of creating duplicates
2. **Use single shared LFO** for global effects (not per-voice)
3. **Disconnect idle modulators** to save CPU
4. **Pre-calculate modulation ranges** instead of real-time computation
5. **Limit active modulation routes** (modulation matrix can grow expensive)

### Modulation vs Direct Updates

**AudioParam Modulation (Preferred):**
```typescript
lfo.connect(filter.frequency); // Audio-rate, smooth
```

**Manual Updates (Avoid):**
```typescript
setInterval(() => {
  filter.frequency.value = calculateLFO(); // Control-rate, choppy
}, 16); // 60 Hz updates
```

**Why prefer AudioParam?**
- Audio-rate updates (44100 Hz vs 60 Hz)
- Smooth, click-free
- Better performance (runs on audio thread)

## Common Modulation Recipes

### Classic Vibrato
- LFO (sine, 5-7 Hz) → Oscillator frequency
- Depth: ±10-20 Hz

### Wah Filter
- LFO (triangle, 0.5-2 Hz) → Bandpass filter frequency
- Center: 400-2000 Hz sweep
- High Q: 10-20

### Auto-Pan
- LFO (sine, 0.2-1 Hz) → Stereo panner
- Depth: ±0.5 (center to hard L/R)

### Dubstep Wobble
- LFO (square/saw, 2-8 Hz) → Lowpass filter cutoff
- Center: 1000 Hz, Depth: ±800 Hz
- High resonance (Q: 10-15)

### Trance Gate
- LFO (square, tempo-synced to 1/16) → Gain
- Depth: 1.0 (full on/off)

### Evolving Pad
- LFO1 (sine, 0.1 Hz) → Filter cutoff
- LFO2 (triangle, 0.15 Hz) → Pitch (±5 cents)  
- LFO3 (sine, 0.08 Hz) → Chorus depth
- All slow, slightly different rates for evolution
