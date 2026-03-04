# Common Audio Bus Configurations

Example implementations for typical signal chain setups.

## 1. Clean / Transparent Chain (No Heavy Processing)

**Use Case:** Preserve original tone, minimal coloration

**Effect Order:**
1. Highpass filter (remove sub-bass rumble: 20Hz)
2. Master gain
3. Limiter (safety catch, barely compressing)

**Code:**
```typescript
export class CleanBusSetup {
  constructor(private effectsManager: EffectsManager) {}
  
  async setup(): Promise<void> {
    // Highpass: Remove DC and sub-bass
    const hp = new HighpassFilter();
    hp.setParameter('cutoff', 20); // 20 Hz
    hp.setParameter('resonance', 0.7);
    this.effectsManager.addEffect(hp);
    
    // Safety limiter
    const limiter = new CompressorEffect();
    limiter.setParameter('threshold', -3); // Start at -3dB
    limiter.setParameter('ratio', 20); // Hard limiting
    limiter.setParameter('attack', 0.001); // Very fast
    limiter.setParameter('release', 0.1);
    this.effectsManager.addEffect(limiter);
  }
}
```

**Gain Staging:**
```
Voice output: -18dB (8 voices @ 0.125 each)
  ↓
Highpass: 0dB (no gain change)
  ↓
Limiter: 0dB (starts at -3dB threshold)
  ↓
Master: -3dB
  ↓
Output: -6dB headroom
```

---

## 2. Warmth / Analog Character Chain

**Use Case:** Add saturation and vintage tone

**Effect Order:**
1. Compressor (slight, for punch)
2. Saturation/Soft Clipping
3. Lowpass filter (smooth highs)
4. Reverb (short, for space)

**Code:**
```typescript
export class WarmthBusSetup {
  constructor(private effectsManager: EffectsManager) {}
  
  async setup(): Promise<void> {
    // Gentle compressor (analog style)
    const compressor = new CompressorEffect();
    compressor.setParameter('threshold', -24);
    compressor.setParameter('ratio', 3); // Soft compression
    compressor.setParameter('attack', 0.005);
    compressor.setParameter('release', 0.15);
    compressor.setMix(0.8); // Blend in
    this.effectsManager.addEffect(compressor);
    
    // Saturation (tape-like distortion)
    const saturation = new DistortionEffect();
    saturation.setParameter('drive', 30); // Subtle
    saturation.setMix(0.3); // Light saturation
    this.effectsManager.addEffect(saturation);
    
    // Smooth highs with lowpass
    const lowpass = new Lowpass24Filter(); // 24dB/oct slope
    lowpass.setParameter('cutoff', 8000); // 8kHz ceiling
    lowpass.setParameter('resonance', 0.7);
    this.effectsManager.addEffect(lowpass);
    
    // Short reverb for space
    const reverb = new ReverbEffect();
    reverb.setParameter('decay', 0.5); // Medium decay
    reverb.setMix(0.25); // Subtle
    this.effectsManager.addEffect(reverb);
  }
}
```

**Characteristics:**
- Slightly compressed (punch/cohesion)
- Warm saturation (adds harmonics)
- Smooth high frequency roll-off
- Small room reverb (dimensional)

---

## 3. Bright / Crystal Clear Chain

**Use Case:** Modern, detailed, transparent highs

**Effect Order:**
1. Highpass filter (remove rumble)
2. Slight compression (glue)
3. Highshelf (brighten air)
4. Very subtle reverb (clarity)

**Code:**
```typescript
export class BrightBusSetup {
  constructor(private effectsManager: EffectsManager) {}
  
  async setup(): Promise<void> {
    // Remove rumble below 50Hz
    const hp = new HighpassFilter();
    hp.setParameter('cutoff', 50);
    hp.setParameter('resonance', 0.7);
    this.effectsManager.addEffect(hp);
    
    // Minimal "glue" compression
    const compressor = new CompressorEffect();
    compressor.setParameter('threshold', -20);
    compressor.setParameter('ratio', 2);
    compressor.setParameter('attack', 0.010);
    compressor.setParameter('release', 0.200);
    compressor.setMix(0.4); // Very subtle blend
    this.effectsManager.addEffect(compressor);
    
    // Brighten air with highshelf
    const highshelf = new HighshelfFilter();
    highshelf.setParameter('cutoff', 5000);
    highshelf.setParameter('gain', 3); // +3dB boost
    this.effectsManager.addEffect(highshelf);
    
    // Tiny reverb for imaging
    const reverb = new ReverbEffect();
    reverb.setParameter('decay', 0.3);
    reverb.setMix(0.12); // Barely audible
    this.effectsManager.addEffect(reverb);
  }
}
```

**Characteristics:**
- Clean low end
- Very little compression (natural dynamics)
- Bright, airy high end
- Minimal reverb (mostly for psychoacoustic space)

---

## 4. Dark / Bassy Chain

**Use Case:** Deep, powerful bass and low-mids

**Effect Order:**
1. Compressor (tame dynamics, add "glue")
2. Lowpass filter (warm, dark)
3. Lowshelf (boost lows)
4. Reverb (add depth)

**Code:**
```typescript
export class DarkBassyBusSetup {
  constructor(private effectsManager: EffectsManager) {}
  
  async setup(): Promise<void> {
    // Strong compression (cohesion)
    const compressor = new CompressorEffect();
    compressor.setParameter('threshold', -18);
    compressor.setParameter('ratio', 4);
    compressor.setParameter('attack', 0.003);
    compressor.setParameter('release', 0.100);
    compressor.setMix(0.7); // Blend in
    this.effectsManager.addEffect(compressor);
    
    // Warm lowpass (dark ceiling)
    const lowpass = new Lowpass24Filter();
    lowpass.setParameter('cutoff', 6000); // Lower ceiling
    lowpass.setParameter('resonance', 2); // More resonance for warmth
    this.effectsManager.addEffect(lowpass);
    
    // Boost lows with lowshelf
    const lowshelf = new LowshelfFilter();
    lowshelf.setParameter('cutoff', 200);
    lowshelf.setParameter('gain', 6); // +6dB boost on lows
    this.effectsManager.addEffect(lowshelf);
    
    // Spacious reverb (depth)
    const reverb = new ReverbEffect();
    reverb.setParameter('decay', 0.8); // Longer tail
    reverb.setMix(0.35); // More present
    this.effectsManager.addEffect(reverb);
  }
}
```

**Characteristics:**
- Compressed (cohesive bass)
- Dark high end (filtered at 6kHz)
- Boosted low frequencies
- Deep reverb (adds dimension to low end)

---

## 5. Aggressive / Distorted Chain

**Use Case:** Synth lead with edge, guitar-like distortion

**Effect Order:**
1. Compressor (prepare signal for distortion)
2. Heavy distortion (add aggression)
3. Highpass after distortion (remove mud)
4. Peaking EQ (presence peak)
5. Delay (rhythmic tail)
6. Reverb (small, for space)

**Code:**
```typescript
export class AggressiveBusSetup {
  constructor(private effectsManager: EffectsManager) {}
  
  async setup(): Promise<void> {
    // Heavy compression (push into distortion)
    const compressor = new CompressorEffect();
    compressor.setParameter('threshold', -15);
    compressor.setParameter('ratio', 8);
    compressor.setParameter('attack', 0.001);
    compressor.setParameter('release', 0.050);
    compressor.setMix(1.0); // Full
    this.effectsManager.addEffect(compressor);
    
    // Hard distortion
    const distortion = new DistortionEffect();
    distortion.setParameter('drive', 80); // Heavy
    distortion.setMix(0.7); // Blend with clean
    this.effectsManager.addEffect(distortion);
    
    // Clean up muddy lows from distortion
    const hp = new HighpassFilter();
    hp.setParameter('cutoff', 150); // Higher cutoff
    hp.setParameter('resonance', 0.7);
    this.effectsManager.addEffect(hp);
    
    // Presence peak (add bite)
    const peaking = new PeakingFilter();
    peaking.setParameter('cutoff', 2000);
    peaking.setParameter('resonance', 5);
    peaking.setParameter('gain', 4); // +4dB peak
    this.effectsManager.addEffect(peaking);
    
    // Rhythmic delay
    const delay = new DelayEffect();
    delay.setParameter('time', 0.250); // Quarter note at 120 BPM
    delay.setParameter('feedback', 0.4);
    delay.setMix(0.3);
    this.effectsManager.addEffect(delay);
    
    // Short reverb
    const reverb = new ReverbEffect();
    reverb.setParameter('decay', 0.4);
    reverb.setMix(0.2);
    this.effectsManager.addEffect(reverb);
  }
}
```

**Gain Staging:**
```
Voice output: -18dB (for polyphony)
  ↓
Compressor: Boosts quieter material, reduces peaks (net ~-3dB)
  ↓
Distortion: Adds harmonics, slight gain reduction with mix
  ↓
Highpass: No gain change
  ↓
Peaking EQ: +4dB at 2kHz
  ↓
Delay: -3dB (to prevent feedback loop)
  ↓
Reverb: -6dB
  ↓
Master: -3dB headroom
```

---

## 6. EDM / Dub Techno Chain

**Use Case:** Punchy drums, wobbly bass, spacious reverb

**Effect Order:**
1. Compressor (punch)
2. Distortion (grit, optional per voice)
3. Gain (voice volume control)
4. Long delay (dub effect)
5. Large reverb (space)
6. Master limiter

**Code:**
```typescript
export class EDMDubBusSetup {
  constructor(private effectsManager: EffectsManager) {}
  
  async setup(): Promise<void> {
    // Hard compressor (kick punch)
    const compressor = new CompressorEffect();
    compressor.setParameter('threshold', -20);
    compressor.setParameter('ratio', 6);
    compressor.setParameter('attack', 0.001);
    compressor.setParameter('release', 0.080);
    compressor.setMix(1.0);
    this.effectsManager.addEffect(compressor);
    
    // Optional: Slight grit on distortion
    const distortion = new DistortionEffect();
    distortion.setParameter('drive', 20); // Subtle
    distortion.setMix(0.15); // Just a touch
    this.effectsManager.addEffect(distortion);
    
    // Dub-style long delay (tempo-synced)
    const delay = new DelayEffect();
    delay.setParameter('time', 0.500); // Half note at 120 BPM
    delay.setParameter('feedback', 0.6); // Long tail
    delay.setMix(0.4);
    this.effectsManager.addEffect(delay);
    
    // Large reverb (hall/cathedral)
    const reverb = new ReverbEffect();
    reverb.setParameter('decay', 1.2); // Long decay
    reverb.setMix(0.5); // Prominent
    this.effectsManager.addEffect(reverb);
    
    // Master safety limiter
    const limiter = new CompressorEffect();
    limiter.setParameter('threshold', -3);
    limiter.setParameter('ratio', 20);
    limiter.setParameter('attack', 0.001);
    limiter.setParameter('release', 0.150);
    limiter.setMix(1.0);
    this.effectsManager.addEffect(limiter);
  }
}
```

**Characteristics:**
- Punchy attack (hard compression)
- Dub-style effects (long delay feedback)
- Spacious (large reverb)
- Safe (limiter prevents clipping)

---

## 7. Ambient / Pad Chain

**Use Case:** Ethereal, evolving soundscapes

**Effect Order:**
1. Gentle compressor (smooth)
2. Subtle saturation (analog feel)
3. Chorus (width)
4. Long reverb (space)
5. Delay (echo)

**Code:**
```typescript
export class AmbientPadBusSetup {
  constructor(private effectsManager: EffectsManager) {}
  
  async setup(): Promise<void> {
    // Barely-there compression (glue, not obvious)
    const compressor = new CompressorEffect();
    compressor.setParameter('threshold', -30);
    compressor.setParameter('ratio', 1.5);
    compressor.setParameter('attack', 0.050);
    compressor.setParameter('release', 0.300);
    compressor.setMix(0.2); // Very subtle
    this.effectsManager.addEffect(compressor);
    
    // Warm saturation
    const saturation = new DistortionEffect();
    saturation.setParameter('drive', 15); // Very subtle
    saturation.setMix(0.2);
    this.effectsManager.addEffect(saturation);
    
    // Wide stereo chorus
    const chorus = new ChorusEffect();
    chorus.setParameter('rate', 0.5); // Slow modulation
    chorus.setParameter('depth', 0.003); // Subtle
    chorus.setMix(0.4);
    this.effectsManager.addEffect(chorus);
    
    // Lush reverb (cathedral)
    const reverb = new ReverbEffect();
    reverb.setParameter('decay', 2.0); // Very long
    reverb.setMix(0.6); // Very wet
    this.effectsManager.addEffect(reverb);
    
    // Echo delay (not rhythmic, atmospheric)
    const delay = new DelayEffect();
    delay.setParameter('time', 1.500); // Long, musical time
    delay.setParameter('feedback', 0.5);
    delay.setMix(0.25);
    this.effectsManager.addEffect(delay);
  }
}
```

**Characteristics:**
- Barely compressed (natural dynamics)
- Warm saturation (personal touch)
- Chorus adds width
- Very wet reverb (60% wet)
- Atmospheric delay (complements reverb)

---

## Setup Selection Helper

| Chain | Tone | Best For | Latency | CPU |
|-------|------|----------|---------|-----|
| Clean | Neutral | Vocals, leads | Low | Low |
| Warmth | Vintage | Pads, basses | Medium | Medium |
| Bright | Modern | High-detail | Low | Low |
| Dark/Bassy | Deep | Bass, subs | Medium | Low |
| Aggressive | Edgy | Synth leads | Medium | Medium |
| EDM/Dub | Energetic | Drums, bass | Low | Medium |
| Ambient | Ethereal | Pads, texture | High | High |

---

## Gain Staging Template

All chains should follow this pattern:

```typescript
class BusGainTemplate {
  async setup(): Promise<void> {
    // 1. Source (voice)
    const voiceCount = 8;
    voiceGain = 1 / voiceCount; // -18dB for 8 voices
    
    // 2. Effects (individually check wet/dry mix)
    // Assume each effect outputs near 1.0 (verify with testing)
    
    // 3. Master control
    const masterGain = dbToGain(-6); // -6dB headroom
    
    // 4. Final output
    // masterGain → context.destination
    
    // Formula:
    // Output = (voice × voiceGain) → effects (various gains) → masterGain → 1.0 (max)
    // Final level = ~0.5 (-6dB safe zone)
  }
}
```

---

## Testing Each Setup

```typescript
async function testBusSetup(setup: any): Promise<void> {
  console.log('Testing signal path...');
  
  // Generate test tone
  const testOsc = context.createOscillator();
  testOsc.frequency.value = 440; // A4
  testOsc.connect(effectsManager.getInputNode());
  
  effectsManager.getOutputNode().connect(context.destination);
  
  testOsc.start();
  
  // Listen for 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  testOsc.stop();
  console.log('Test complete');
}
```

Choose a setup that matches your musical goal, then customize the effect parameters for your taste!
