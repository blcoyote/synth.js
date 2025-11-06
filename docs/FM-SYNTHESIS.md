# FM Synthesis (Frequency Modulation)

## Overview
Oscillators 2 and 3 can now modulate the frequency of Oscillator 1 instead of sending their audio signal directly to the output. This enables classic FM synthesis techniques for creating complex, harmonic-rich timbres.

## What is FM Synthesis?
Frequency Modulation (FM) synthesis works by using one oscillator (the **modulator**) to rapidly change the frequency of another oscillator (the **carrier**). This creates sidebands - additional frequencies that give the sound a rich, harmonic complexity.

### Key Terminology
- **Carrier**: Oscillator 1 - the oscillator whose frequency is being modulated. This is what you hear.
- **Modulator**: Oscillator 2 or 3 - the oscillator doing the modulating. When FM is enabled, you don't hear this directly.
- **FM Depth**: Controls how much the modulator affects the carrier's frequency (measured in Hz).

## How to Use FM Synthesis

### Basic Setup
1. **Enable Oscillator 1** (the carrier)
   - This will be your main sound source
   - Choose any waveform (sine, saw, square, triangle)
   
2. **Enable Oscillator 2 or 3** (the modulator)
   - Choose the waveform for modulation
   - Set octave and detune for the modulator frequency
   
3. **Enable FM Modulation**
   - In the modulator's controls, find the "🔀 FM Modulation (Osc 1)" section
   - Click "Enable FM" button
   - Adjust "FM Depth" slider (0-5000 Hz)

### Signal Flow

#### Normal Mode (FM Disabled)
```
Oscillator → Pan → Envelope → Oscillator Bus → Master Output
```

#### FM Mode (FM Enabled on Osc 2/3)
```
Modulator Osc → Pan → Envelope → FM Gain → Carrier Osc 1 Frequency
Carrier Osc 1 → Pan → Envelope → Osc1 Bus → Master Output
```

## FM Depth Parameter
The FM Depth controls the intensity of modulation:
- **0 Hz**: No modulation (no effect)
- **100-500 Hz**: Subtle harmonics, slight timbral changes
- **500-1500 Hz**: Noticeable harmonic content, good for bells and metallic sounds
- **1500-3000 Hz**: Strong harmonic content, complex timbres
- **3000-5000 Hz**: Extreme modulation, very bright and harsh sounds

## Sound Design Tips

### Bell-like Sounds
```
Carrier (Osc 1): Sine wave
Modulator (Osc 2): Sine wave, +1 or +2 octaves
FM Depth: 800-1500 Hz
Envelope 1: Fast attack, medium decay, no sustain, short release
Envelope 2: Fast attack, fast decay, no sustain, no release
```

### Metallic/Inharmonic Sounds
```
Carrier (Osc 1): Sine or Square wave
Modulator (Osc 2): Sine wave, non-harmonic ratio (e.g., detune +37¢)
FM Depth: 2000-4000 Hz
Envelope 1: Fast attack, long decay, medium sustain
Envelope 2: Fast attack, fast decay, no sustain
```

### Brass-like Sounds
```
Carrier (Osc 1): Sawtooth wave
Modulator (Osc 2): Sine wave, same octave or -1 octave
FM Depth: 400-800 Hz
Envelope 1: Medium attack, medium decay, high sustain, short release
Envelope 2: Medium attack, short decay, high sustain, short release
```

### Organic/Vocal Sounds
```
Carrier (Osc 1): Sawtooth or Triangle wave
Modulator (Osc 2): Triangle wave, +1 octave, slight detune
FM Depth: 600-1200 Hz
Envelope 1: Slow attack, long decay, medium sustain, long release
Envelope 2: Slow attack, medium decay, high sustain, short release
```

### Dual FM (Both Osc 2 and 3 modulating Osc 1)
```
Carrier (Osc 1): Sine wave
Modulator 1 (Osc 2): Sine wave, +1 octave, FM Depth: 800 Hz
Modulator 2 (Osc 3): Sine wave, +2 octaves, FM Depth: 400 Hz
Result: Complex, evolving timbres with multiple harmonic series
```

## Technical Details

### Implementation
- When FM is enabled on Osc 2 or 3, its audio output is disconnected from the master bus
- Instead, it's routed through its envelope and a gain node (set to FM Depth) to Osc 1's frequency parameter
- The modulator still responds to its own envelope, allowing for time-varying modulation
- Multiple modulators can be active simultaneously, creating additive FM effects

### Envelope Interaction
- **Carrier Envelope (Env 1)**: Controls the overall amplitude (loudness) of the sound
- **Modulator Envelope (Env 2 or 3)**: Controls how the FM intensity changes over time
  - Fast decay = bright attack that dulls quickly
  - Long decay = sustained brightness
  - No sustain = FM only during attack/decay phase

### Modulator Frequency Relationships
The ratio between carrier and modulator frequencies determines the harmonic content:
- **Harmonic ratios** (1:1, 1:2, 2:3, 3:4, etc.) = musical, tonal sounds
- **Inharmonic ratios** (non-integer ratios) = bell-like, metallic sounds
- Use octave shifts and detune to find interesting ratios

### Volume Control
When FM is enabled:
- The **modulator's volume control** has no effect on output level (it's not going to audio output)
- The **carrier's volume control** (Osc 1) controls the overall output level
- Adjust FM Depth to control modulation intensity instead

## Comparison with Traditional Oscillator Mixing

### Without FM (Normal Mode)
```
Result: Simple additive synthesis - waveforms add together
Character: Thick, chorused, layered sounds
```

### With FM (FM Mode)
```
Result: Complex spectral changes - new frequencies created
Character: Bright, evolving, harmonic-rich timbres
```

## Troubleshooting

### "I enabled FM but hear no difference"
- Check that **FM Depth is above 0** (try 1000 Hz as a starting point)
- Ensure the **modulator oscillator is enabled**
- Verify **Oscillator 1 is enabled** (it's the carrier)
- Check that **Envelope 2/3 has sustain** if you want continuous FM

### "Sound is too harsh/bright"
- **Reduce FM Depth** to 200-500 Hz
- Use a **sine or triangle waveform** for the modulator
- Lower the **modulator's octave** setting
- Reduce **Envelope 2/3 sustain level**

### "Sound is too weak when I enable FM"
- FM modulation can create phase cancellations
- **Increase Oscillator 1 volume**
- Try different **modulator octave settings**
- Adjust **FM Depth** - sometimes less is more

### "I want to hear both FM and the modulator"
- You can't in this implementation - it's either FM or audio output
- To hear both: **enable Oscillator 3** as a second modulator
- Use one for FM, keep one in normal audio mode

## Advanced Techniques

### Time-Varying FM
Use different envelope settings on the modulator to create evolving timbres:
```
Carrier Envelope: Slow attack, long release
Modulator Envelope: Fast attack, fast decay, no sustain
Result: Bright attack that becomes purer over time
```

### Vibrato + FM
- Enable LFO pitch modulation in trigger mode
- Enable FM on Osc 2
- Result: Frequency modulation with slow vibrato overlay

### Filter + FM
- Use FM to create harmonic content
- Use the lowpass filter to sculpt the brightness
- Sweep filter cutoff for classic FM brass sounds

## Examples by Genre

### Electronic/EDM
- High FM depths (2000-4000 Hz)
- Fast envelopes
- Square or sawtooth modulators
- High resonance on filter

### Ambient/Pad
- Low-medium FM depths (500-1500 Hz)
- Slow envelopes
- Sine or triangle modulators
- Light chorus or reverb

### Retro/80s
- Medium FM depths (800-2000 Hz)
- Plucky envelopes (fast decay, no sustain)
- Detuned modulators for width
- Delay effects

---

*Remember: FM synthesis is all about experimentation. Start with low FM depths and gradually increase until you find interesting sounds. The interaction between carrier frequency, modulator frequency, FM depth, and envelope shapes creates an infinite palette of timbres.*
