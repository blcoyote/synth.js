# Effects Cookbook

Common audio effect algorithms and implementation patterns using Web Audio API.

## Time-Based Effects

### Delay / Echo

**Algorithm:** Store audio in buffer, play back after delay time

```typescript
export class DelayEffect extends BaseEffect {
  private delayNode: DelayNode;
  private feedbackNode: GainNode;
  
  constructor() {
    super('Delay', 'delay');
    
    this.delayNode = this.engine.createDelay(5.0); // Max 5 seconds
    this.feedbackNode = this.engine.createGain();
    
    // Create feedback loop
    this.delayNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);
    
    // Connect wet path
    this.connectWetPath(this.delayNode);
  }
  
  setParameter(param: string, value: number): void {
    switch(param) {
      case 'time':
        this.delayNode.delayTime.value = value; // 0-5 seconds
        break;
      case 'feedback':
        this.feedbackNode.gain.value = Math.min(value, 0.95); // Cap at 0.95 to prevent runaway
        break;
    }
  }
}
```

**Parameters:**
- **Time:** 0.001-5 seconds (musical delays: 1/16, 1/8, 1/4 notes)
- **Feedback:** 0-0.95 (amount of delayed signal fed back)
- **Mix:** 0-1 (wet/dry balance)

**Use Cases:**
- Slapback: Short time (50-150ms), low feedback (0.2-0.4)
- Echo: Medium time (200-500ms), medium feedback (0.4-0.6)
- Infinite echo: Long time, high feedback (0.8-0.95)

**Tempo-Synced Delay:**
```typescript
const bpm = 120;
const noteValue = 1/4; // Quarter note
const delayTime = (60 / bpm) * (4 * noteValue); // In seconds
delayNode.delayTime.value = delayTime;
```

### Reverb

**Algorithm:** Multiple delayed reflections simulating acoustic space

**Simple Reverb (Convolution):**
```typescript
const convolver = context.createConvolver();
convolver.buffer = impulseResponse; // Load IR from file or generate

input.connect(convolver).connect(output);
```

**Algorithmic Reverb (Feedback Delay Network):**
```typescript
export class ReverbEffect extends BaseEffect {
  private delays: DelayNode[] = [];
  private feedbackGains: GainNode[] = [];
  
  constructor() {
    super('Reverb', 'reverb');
    
    // Create multiple delay lines with different times
    const delayTimes = [0.037, 0.041, 0.043, 0.047]; // Prime numbers (ms)
    
    delayTimes.forEach(time => {
      const delay = this.engine.createDelay();
      const feedback = this.engine.createGain();
      
      delay.delayTime.value = time;
      feedback.gain.value = 0.6;
      
      delay.connect(feedback);
      feedback.connect(delay);
      
      this.delays.push(delay);
      this.feedbackGains.push(feedback);
    });
    
    // Mix all delays to output
    const mixer = this.engine.createGain();
    this.delays.forEach(d => d.connect(mixer));
    this.connectWetPath(mixer);
  }
  
  setParameter(param: string, value: number): void {
    if (param === 'decay') {
      this.feedbackGains.forEach(g => g.gain.value = value);
    }
  }
}
```

**Parameters:**
- **Decay:** 0-0.95 (reverb tail length)
- **Pre-delay:** 0-100ms (delay before reverb starts)
- **Mix:** 0-1 (dry/wet balance)

**Room Size Simulation:**
- Small: Short delays (10-30ms), low feedback
- Medium: Medium delays (30-60ms), medium feedback
- Large (Hall): Long delays (60-100ms), high feedback

### Chorus

**Algorithm:** Multiple slightly detuned and delayed copies

```typescript
export class ChorusEffect extends BaseEffect {
  private delays: DelayNode[] = [];
  private lfos: OscillatorNode[] = [];
  private lfoGains: GainNode[] = [];
  
  constructor() {
    super('Chorus', 'chorus');
    
    const voiceCount = 3;
    const baseDelay = 0.020; // 20ms
    const depth = 0.005;     // ±5ms modulation
    
    for (let i = 0; i < voiceCount; i++) {
      const delay = this.engine.createDelay();
      const lfo = this.engine.createOscillator();
      const lfoGain = this.engine.createGain();
      
      delay.delayTime.value = baseDelay;
      lfo.frequency.value = 0.5 + (i * 0.1); // Slightly different rates
      lfoGain.gain.value = depth;
      
      lfo.connect(lfoGain).connect(delay.delayTime);
      lfo.start();
      
      this.delays.push(delay);
      this.lfos.push(lfo);
      this.lfoGains.push(lfoGain);
    }
    
    const mixer = this.engine.createGain();
    mixer.gain.value = 1 / voiceCount;
    this.delays.forEach(d => d.connect(mixer));
    this.connectWetPath(mixer);
  }
  
  setParameter(param: string, value: number): void {
    switch(param) {
      case 'rate':
        this.lfos.forEach((lfo, i) => {
          lfo.frequency.value = value + (i * 0.1);
        });
        break;
      case 'depth':
        this.lfoGains.forEach(g => g.gain.value = value);
        break;
    }
  }
}
```

**Parameters:**
- **Rate:** 0.1-5 Hz (LFO speed)
- **Depth:** 0.001-0.01 seconds (modulation amount)
- **Voices:** 2-4 (number of delayed copies)

### Flanger

**Algorithm:** Chorus with shorter delays and feedback

```typescript
export class FlangerEffect extends BaseEffect {
  private delayNode: DelayNode;
  private lfo: OscillatorNode;
  private lfoGain: GainNode;
  private feedbackNode: GainNode;
  
  constructor() {
    super('Flanger', 'flanger');
    
    this.delayNode = this.engine.createDelay(0.050);
    this.lfo = this.engine.createOscillator();
    this.lfoGain = this.engine.createGain();
    this.feedbackNode = this.engine.createGain();
    
    // Base delay: 1-10ms
    this.delayNode.delayTime.value = 0.005;
    this.lfo.frequency.value = 0.5;
    this.lfoGain.gain.value = 0.002; // ±2ms modulation
    this.feedbackNode.gain.value = 0.7;
    
    // Feedback path
    this.delayNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);
    
    // LFO modulation
    this.lfo.connect(this.lfoGain).connect(this.delayNode.delayTime);
    this.lfo.start();
    
    this.connectWetPath(this.delayNode);
  }
}
```

**Key Difference from Chorus:**
- Shorter delays (1-10ms vs 20-50ms)
- Higher feedback creates "jet plane" sweeps
- More dramatic, metallic sound

## Modulation Effects

### Phaser

**Algorithm:** Series of allpass filters with swept center frequency

```typescript
export class PhaserEffect extends BaseEffect {
  private allpassFilters: BiquadFilterNode[] = [];
  private lfo: OscillatorNode;
  private lfoGain: GainNode;
  
  constructor() {
    super('Phaser', 'phaser');
    
    const stages = 4; // 4-12 stages typical
    const baseFreq = 440;
    const depth = 800;
    
    // Create allpass filter cascade
    for (let i = 0; i < stages; i++) {
      const filter = this.engine.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = baseFreq;
      filter.Q.value = 1;
      this.allpassFilters.push(filter);
    }
    
    // Chain filters
    for (let i = 0; i < stages - 1; i++) {
      this.allpassFilters[i].connect(this.allpassFilters[i + 1]);
    }
    
    // LFO modulates all filter frequencies
    this.lfo = this.engine.createOscillator();
    this.lfoGain = this.engine.createGain();
    this.lfo.frequency.value = 0.5;
    this.lfoGain.gain.value = depth;
    
    this.allpassFilters.forEach(f => {
      this.lfo.connect(this.lfoGain).connect(f.frequency);
    });
    this.lfo.start();
    
    this.connectWetPath(this.allpassFilters[0]);
  }
}
```

**Parameters:**
- **Rate:** 0.1-10 Hz (sweep speed)
- **Depth:** 100-2000 Hz (sweep range)
- **Stages:** 2-12 (more stages = more notches)
- **Feedback:** 0-0.95 (intensity)

### Tremolo

**Algorithm:** Amplitude modulation (volume oscillation)

```typescript
export class TremoloEffect extends BaseEffect {
  private lfo: OscillatorNode;
  private lfoGain: GainNode;
  private dcOffset: ConstantSourceNode;
  
  constructor() {
    super('Tremolo', 'tremolo');
    
    const depthControl = this.engine.createGain();
    this.lfo = this.engine.createOscillator();
    this.lfoGain = this.engine.createGain();
    this.dcOffset = this.engine.createConstantSource();
    
    this.lfo.frequency.value = 5; // 5 Hz
    this.lfoGain.gain.value = 0.5; // 50% depth
    this.dcOffset.offset.value = 1; // Center around 1.0
    
    // LFO modulates gain
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(depthControl.gain);
    this.dcOffset.connect(depthControl.gain);
    
    this.lfo.start();
    this.dcOffset.start();
    
    this.connectWetPath(depthControl);
  }
  
  setParameter(param: string, value: number): void {
    switch(param) {
      case 'rate':
        this.lfo.frequency.value = value; // 0.1-20 Hz
        break;
      case 'depth':
        this.lfoGain.gain.value = value; // 0-1
        break;
    }
  }
}
```

### Vibrato

**Algorithm:** Pitch modulation (frequency oscillation)

Similar to tremolo, but modulate oscillator.frequency instead of gain.

```typescript
const lfo = context.createOscillator();
const lfoGain = context.createGain();

lfo.frequency.value = 5; // 5 Hz vibrato
lfoGain.gain.value = 10; // ±10 Hz pitch deviation

lfo.connect(lfoGain).connect(oscillator.frequency);
lfo.start();
```

## Dynamics Effects

### Compressor

**Purpose:** Reduce dynamic range (quiet louder, loud quieter)

```typescript
export class CompressorEffect extends BaseEffect {
  private compressor: DynamicsCompressorNode;
  
  constructor() {
    super('Compressor', 'compressor');
    
    this.compressor = this.engine.createDynamicsCompressor();
    this.compressor.threshold.value = -24;    // dB
    this.compressor.knee.value = 30;          // dB
    this.compressor.ratio.value = 12;         // X:1
    this.compressor.attack.value = 0.003;     // seconds
    this.compressor.release.value = 0.250;    // seconds
    
    this.connectWetPath(this.compressor);
  }
  
  setParameter(param: string, value: number): void {
    switch(param) {
      case 'threshold':
        this.compressor.threshold.value = value; // -100 to 0 dB
        break;
      case 'ratio':
        this.compressor.ratio.value = value; // 1-20
        break;
      case 'attack':
        this.compressor.attack.value = value; // 0-1 seconds
        break;
      case 'release':
        this.compressor.release.value = value; // 0-1 seconds
        break;
    }
  }
}
```

**Parameters:**
- **Threshold:** -60 to 0 dB (level above which compression starts)
- **Ratio:** 1:1 to 20:1 (amount of compression)
- **Attack:** 0.001-1 seconds (how fast compression engages)
- **Release:** 0.01-1 seconds (how fast compression disengages)
- **Knee:** 0-40 dB (smoothness of compression onset)

**Common Settings:**
- Gentle: Threshold -24dB, Ratio 3:1, Attack 10ms, Release 100ms
- Pumping: Threshold -30dB, Ratio 10:1, Attack 1ms, Release 50ms
- Limiting: Threshold -6dB, Ratio 20:1, Attack 0.1ms, Release 200ms

### Limiter

Compressor with very high ratio (20:1) and low threshold to prevent clipping.

## Distortion Effects

### Overdrive / Distortion

**Algorithm:** Waveshaping (non-linear transfer function)

```typescript
export class DistortionEffect extends BaseEffect {
  private waveshaper: WaveShaperNode;
  private preGain: GainNode;
  private postGain: GainNode;
  
  constructor() {
    super('Distortion', 'distortion');
    
    this.waveshaper = this.engine.createWaveShaper();
    this.preGain = this.engine.createGain();
    this.postGain = this.engine.createGain();
    
    this.preGain.gain.value = 1;
    this.postGain.gain.value = 0.5; // Compensate for gain increase
    
    this.waveshaper.curve = this.makeDistortionCurve(50); // Amount
    this.waveshaper.oversample = '4x'; // Reduce aliasing
    
    this.preGain.connect(this.waveshaper).connect(this.postGain);
    this.connectWetPath(this.preGain);
  }
  
  private makeDistortionCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2 / samples) - 1;
      curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
    }
    
    return curve;
  }
  
  setParameter(param: string, value: number): void {
    if (param === 'drive') {
      this.waveshaper.curve = this.makeDistortionCurve(value);
    }
  }
}
```

**Waveshaper Curves:**

**Soft Clipping (Tanh):**
```typescript
for (let i = 0; i < samples; i++) {
  const x = (i * 2 / samples) - 1;
  curve[i] = Math.tanh(x * amount);
}
```

**Hard Clipping:**
```typescript
curve[i] = Math.max(-1, Math.min(1, x * amount));
```

**Asymmetric (Tube-like):**
```typescript
curve[i] = x < 0 ? x : Math.tanh(x * amount);
```

### Bitcrusher

**Algorithm:** Reduce bit depth and sample rate

```typescript
export class BitcrusherEffect extends BaseEffect {
  private scriptNode: ScriptProcessorNode;
  private bits = 8;
  private normFreq = 0.5;
  
  constructor() {
    super('Bitcrusher', 'bitcrusher');
    
    this.scriptNode = this.engine.createScriptProcessor(4096, 1, 1);
    let lastSample = 0;
    let phaseInc = 0;
    let phase = 0;
    
    this.scriptNode.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      const step = Math.pow(0.5, this.bits);
      
      for (let i = 0; i < input.length; i++) {
        phase += phaseInc;
        
        if (phase >= 1) {
          phase -= 1;
          lastSample = step * Math.floor(input[i] / step + 0.5);
        }
        
        output[i] = lastSample;
      }
    };
    
    this.connectWetPath(this.scriptNode);
  }
  
  setParameter(param: string, value: number): void {
    if (param === 'bits') {
      this.bits = value; // 1-16 bits
    } else if (param === 'sampleRate') {
      this.normFreq = value; // 0-1 (normalized frequency)
    }
  }
}
```

**Note:** Consider using AudioWorklet instead of ScriptProcessorNode for better performance.

### Ring Modulator

**Algorithm:** Multiply input signal by carrier frequency

```typescript
export class RingModulatorEffect extends BaseEffect {
  private carrier: OscillatorNode;
  private carrierGain: GainNode;
  
  constructor() {
    super('Ring Modulator', 'ring-mod');
    
    this.carrier = this.engine.createOscillator();
    this.carrierGain = this.engine.createGain();
    
    this.carrier.frequency.value = 440;
    this.carrierGain.gain.value = 0; // Acts as multiplier via gain modulation
    
    this.carrier.connect(this.carrierGain.gain); // Modulate gain with carrier
    this.carrier.start();
    
    this.connectWetPath(this.carrierGain);
  }
  
  setParameter(param: string, value: number): void {
    if (param === 'frequency') {
      this.carrier.frequency.value = value; // 20-2000 Hz
    }
  }
}
```

**Sound:** Metallic, inharmonic, "robot voice"

## Effect Ordering Guidelines

**Typical Signal Chain:**
1. **Dynamics** (Compressor) - Control input level
2. **Distortion** - Add harmonics to controlled signal
3. **Filter** - Shape distorted tone
4. **Modulation** (Chorus, Flanger, Phaser) - Add movement
5. **Time** (Delay, Reverb) - Add space

**Why this order?**
- Compress before distortion prevents inconsistent distortion
- Filter after distortion shapes the harmonics
- Time effects last preserve clarity

**Exceptions:**
- Filter before distortion: More pronounced filter sweep
- Reverb before distortion: Unusual, ambient textures

## Performance Tips

1. **Reuse effect instances** across voices when possible
2. **Disable bypassed effects** (disconnect from graph)
3. **Use lighter effects** for polyphonic sources
4. **Convolution reverb** use pre-loaded impulse responses
5. **Avoid ScriptProcessorNode** (use AudioWorklet instead)
6. **Monitor CPU usage** with Chrome DevTools

## Common Effect Chains

**Ambient Pad:**
Chorus → Reverb (long decay) → Delay (feedback 0.7)

**Aggressive Lead:**
Distortion → Lowpass Filter (swept) → Delay (short, feedback 0.3)

**Retro Game:**
Bitcrusher → Simple Delay

**Vocal Effect:**
Compressor → Chorus → Reverb

**Dub Techno:**
Lowpass Filter → Delay (long, high feedback) → Reverb
