# Arpeggiator Component

The Arpeggiator is a musical pattern generator that converts chords into sequential note patterns. It provides 13 different arpeggio patterns, musical chord progressions, and extensive timing controls.

## Features

- **13 Arpeggio Patterns**: Up, Down, Up-Down, Converge, Diverge, Pinched, Random, Shuffle, Chord, and more
- **Octave Spanning**: 1-4 octaves with automatic note expansion
- **Flexible Timing**: 6 note divisions (quarter notes to 32nd notes, including triplets)
- **Musical Controls**: Tempo (40-300 BPM), swing, gate length, and humanization
- **Preset Chords**: Major, Minor, Sus, Diminished, Augmented, and 7th chords
- **Chord Progressions**: Pre-programmed progressions (I-IV-V, I-V-vi-IV, ii-V-I, etc.)
- **Real-time Control**: Change patterns, chords, and parameters while playing

## Basic Usage

```typescript
import { Arpeggiator } from './components/modulation';

// Create arpeggiator
const arp = new Arpeggiator({
  pattern: 'up',
  octaves: 2,
  tempo: 120,
  division: '1/16',
  gateLength: 0.8,
});

// Set a chord (C major)
arp.setChord(60, 'major');

// Register note callback
arp.onNote((note) => {
  console.log(`Play note: ${note.pitch} at velocity ${note.velocity}`);
  // Trigger your synth voice here
});

// Start playback
arp.start();

// Change pattern on the fly
arp.setPattern('updown');

// Stop playback
arp.stop();
```

## Patterns

### Basic Patterns
- **up**: Notes ascending (C → E → G)
- **down**: Notes descending (G → E → C)
- **updown**: Up then down, no repeat (C → E → G → E)
- **downup**: Down then up (G → E → C → E)

### Advanced Patterns
- **updown2**: Up then down, repeat top note (C → E → G → G → E)
- **downup2**: Down then up, repeat bottom note (G → E → C → C → E)
- **converge**: Outside to inside (C → G → E)
- **diverge**: Inside to outside (E → C → G)
- **pinchedUp**: Bottom, top, then ascending (C → G → E)
- **pinchedDown**: Top, bottom, then descending (G → C → E)

### Special Patterns
- **random**: Random note selection
- **shuffle**: Each note once per cycle in random order
- **chord**: All notes simultaneously

## Chord Types

```typescript
// Set different chord types
arp.setChord(60, 'major');    // C major: C E G
arp.setChord(60, 'minor');    // C minor: C Eb G
arp.setChord(60, 'major7');   // C major 7: C E G B
arp.setChord(60, 'dom7');     // C dominant 7: C E G Bb
arp.setChord(60, 'sus4');     // C sus4: C F G
arp.setChord(60, 'dim');      // C diminished: C Eb Gb
arp.setChord(60, 'aug');      // C augmented: C E G#
```

## Chord Progressions

```typescript
// Load preset progressions
arp.loadProgression('major-i-iv-v', 60);        // I-IV-V (Major)
arp.loadProgression('major-i-v-vi-iv', 60);     // I-V-vi-IV (Pop)
arp.loadProgression('jazz-ii-v-i', 60);         // ii-V-I (Jazz)
arp.loadProgression('ambient-sus', 60);         // Suspended Ambient

// Get all available progressions
const progressions = Arpeggiator.getProgressionNames();
```

## Advanced Usage

### Custom Note Sequences

```typescript
// Set custom notes directly
arp.setNotes([60, 64, 67, 71]); // Cmaj7 chord
arp.setNotes([60, 63, 66]);     // C diminished triad
```

### Timing Control

```typescript
// Adjust tempo
arp.setTempo(140); // 140 BPM

// Change note division
arp.setDivision('1/8');   // Eighth notes
arp.setDivision('1/16T'); // Sixteenth note triplets

// Set gate length (0-1)
arp.setGateLength(0.5); // 50% gate, staccato
arp.setGateLength(0.95); // 95% gate, legato
```

### Musical Timing Effects

```typescript
// Add swing (0-1)
arp.setSwing(0.3); // 30% swing, groove feel

// Add humanization (0-1)
arp.setHumanize(0.2); // 20% timing/velocity variation
```

### Octave Control

```typescript
// Expand across octaves
arp.setOctaves(1); // Single octave
arp.setOctaves(3); // Three octaves
```

### Integration with Synth

```typescript
import { AudioEngine } from './core';
import { BusManager } from './bus';
import { SineOscillator } from './components/oscillators';
import { ADSREnvelope } from './components/envelopes';
import { Arpeggiator } from './components/modulation';

const engine = AudioEngine.getInstance();
await engine.initialize();

const busManager = BusManager.getInstance();
busManager.initialize();
const masterBus = busManager.getMasterBus();

const arp = new Arpeggiator({
  pattern: 'updown',
  octaves: 2,
  tempo: 130,
  division: '1/16',
});

arp.setChord(60, 'minor7');

// Voice management
const voices = new Map();

arp.onNote((note) => {
  // Convert MIDI to frequency
  const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);
  
  // Create voice
  const osc = new SineOscillator(freq);
  const env = new ADSREnvelope({
    attack: 0.005,
    decay: 0.05,
    sustain: 0.7,
    release: 0.1,
  });
  
  // Connect: Osc → Env → Master
  osc.connect(env.getNode());
  env.connect(masterBus.getInputNode());
  
  // Trigger
  osc.start();
  env.trigger(note.velocity / 127);
  
  // Store voice
  const voiceId = Date.now() + Math.random();
  voices.set(voiceId, { osc, env });
  
  // Schedule release
  setTimeout(() => {
    env.triggerRelease();
    setTimeout(() => {
      osc.stop();
      voices.delete(voiceId);
    }, 200);
  }, getNoteDuration() * note.gate);
});

arp.start();
```

## Events

### Note Events

```typescript
arp.onNote((note) => {
  // Triggered for each note
  console.log(`Note: ${note.pitch}, Velocity: ${note.velocity}, Gate: ${note.gate}`);
});
```

### Cycle Complete Events

```typescript
arp.onCycleComplete(() => {
  // Triggered when pattern completes one full cycle
  console.log('Pattern cycle complete');
  
  // Could be used to change chords in a progression
  arp.setChord(65, 'major'); // Change to F major
});
```

## API Reference

### Constructor

```typescript
new Arpeggiator(config?: ArpeggiatorConfig)
```

**Config Options:**
- `pattern?: ArpPattern` - Initial pattern (default: 'up')
- `octaves?: number` - Octave range 1-4 (default: 1)
- `tempo?: number` - BPM 40-300 (default: 120)
- `division?: NoteDivision` - Note division (default: '1/16')
- `gateLength?: number` - Gate 0-1 (default: 0.8)
- `swing?: number` - Swing 0-1 (default: 0)
- `humanize?: number` - Humanization 0-1 (default: 0)

### Methods

**Playback Control:**
- `start()` - Start arpeggiator
- `stop()` - Stop and reset
- `pause()` - Pause (maintains position)
- `resume()` - Resume from pause
- `reset()` - Reset to beginning
- `isRunning(): boolean` - Check if playing

**Notes & Chords:**
- `setNotes(notes: number[])` - Set custom notes
- `getNotes(): number[]` - Get current notes
- `setChord(root: number, type: ChordType)` - Set chord
- `loadProgression(name: string, root: number): boolean` - Load progression
- `getSequence(): number[]` - Get generated sequence

**Pattern:**
- `setPattern(pattern: ArpPattern)` - Set pattern
- `getPattern(): ArpPattern` - Get current pattern

**Timing:**
- `setTempo(bpm: number)` - Set tempo
- `getTempo(): number` - Get tempo
- `setDivision(division: NoteDivision)` - Set note division
- `getDivision(): NoteDivision` - Get division
- `setGateLength(length: number)` - Set gate length
- `getGateLength(): number` - Get gate length
- `setSwing(swing: number)` - Set swing
- `getSwing(): number` - Get swing
- `setHumanize(amount: number)` - Set humanization
- `getHumanize(): number` - Get humanization

**Range:**
- `setOctaves(octaves: number)` - Set octave range
- `getOctaves(): number` - Get octave range

**Events:**
- `onNote(callback: (note: ArpNote) => void)` - Register note callback
- `onCycleComplete(callback: () => void)` - Register cycle callback

**Static Methods:**
- `Arpeggiator.getProgressionNames(): string[]` - List progressions
- `Arpeggiator.getProgression(name: string): ChordProgression | undefined` - Get progression details

**Cleanup:**
- `dispose()` - Clean up resources

## Demo

Try the interactive demo at `/arpeggiator.html` to experiment with all patterns, chords, and settings in real-time.

## Musical Applications

1. **Synth Sequences**: Classic arpeggio synth patterns
2. **Chord Accompaniment**: Rhythmic chord backing
3. **Lead Melodies**: Melodic sequences from chord progressions
4. **Generative Music**: Random and shuffle patterns for ambient textures
5. **Bass Lines**: Use converge/diverge patterns with low octaves
6. **Rhythmic Interest**: Add swing and humanization for groove
7. **Live Performance**: Change patterns and chords on the fly

## Tips

- **Start Simple**: Begin with 'up' or 'down' patterns at 1 octave
- **Experiment with Divisions**: Try triplets for jazzy feels
- **Use Swing**: Add groove with 20-40% swing
- **Layer Octaves**: Stack multiple arpeggiators at different octaves
- **Humanize**: Add 10-20% humanization for natural feel
- **Short Gates**: Use 40-60% gate for plucky sounds
- **Long Gates**: Use 90%+ gate for pads and sustained sounds
- **Pattern Changes**: Automate pattern changes for dynamic arrangements
- **Chord Progressions**: Use cycle complete event to advance through progressions
