# Modular Synthesizer - A Learning Journey

A fully-featured polyphonic synthesizer built with React, TypeScript, and Web Audio API. Features three oscillators with FM synthesis, comprehensive modulation routing, effects processing, and a complete preset system.

## Live Demo

**Try it now: [https://blcoyote.github.io/synth.js/](https://blcoyote.github.io/synth.js/)**

The synthesizer is deployed and available online via GitHub Pages. No installation required - just open the link and start making sounds with your computer keyboard or mouse.

## Project Philosophy

This project is designed as a learning journey to understand:

- Digital Signal Processing (DSP) and audio synthesis
- Real-time audio processing with Web Audio API
- Modular architecture and clean code patterns
- Comprehensive testing strategies
- React application development for audio tools

## Key Features

### Sound Generation
- **Three Oscillators**: Independent waveform, volume, pan, octave, and detune controls
- **FM Synthesis**: Oscillator 2 can modulate Oscillator 1 with adjustable depth
- **Polyphonic Voices**: Play multiple notes simultaneously with proper voice management
- **Four Waveforms**: Sine, Sawtooth, Square, and Triangle waves

### Modulation & Control
- **ADSR Envelopes**: Per-oscillator attack, decay, sustain, and release controls
- **Multi-Target LFO**: Modulate pitch, volume, pan, or filter cutoff independently
- **Arpeggiator**: 10+ patterns including up, down, random, chords, and progressions
- **Step Sequencer**: Create melodic patterns with multiple playback modes

### Sound Shaping
- **Master Filter**: 10 filter types (lowpass, highpass, bandpass, notch, allpass, peaking, shelving, lowpass24)
- **Effects Chain**: Delay, reverb, distortion, chorus, shimmer, flanger, phaser, ring modulator, and compressor
- **Real-time Updates**: All parameters respond immediately, even on sustained notes

### User Interface
- **Visual Feedback**: Waveform analyzers for each oscillator and spectrum analyzer for master output
- **Computer Keyboard**: US keyboard layout mapping (Z-' bottom row, Q-] top row)
- **Mouse Support**: Click-to-play virtual piano keyboard
- **Preset System**: Save, load, and manage custom presets with localStorage persistence
- **Factory Presets**: 50+ built-in sounds to get started

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Architecture

### Project Structure

```
/src
  /core           # Audio engine, voice management, preset system
    AudioEngine.ts      # Web Audio context and node creation
    SynthEngine.ts      # Main synthesizer orchestration
    VoiceManager.ts     # Polyphonic voice allocation
    PresetManager.ts    # Save/load preset system
    ParameterManager.ts # Real-time parameter updates
    LFOManager.ts       # Multi-target LFO control
  /components
    /oscillators  # Sine, Sawtooth, Square, Triangle, FM
    /filters      # 10 filter types with resonance control
    /effects      # 9 effect processors
    /envelopes    # ADSR envelope generators
    /modulation   # LFO, arpeggiator, sequencer
    /voice        # Voice synthesis and routing
  /ui             # React components for all panels
    OscillatorPanel.tsx
    FilterPanel.tsx
    EffectsPanel.tsx
    LFOPanel.tsx
    EnvelopePanel.tsx
    PresetPanel.tsx
    SimpleKeyboard.tsx
    ArpeggiatorPanel.tsx
    SequencerPanel.tsx
  /hooks          # React hooks
    useKeyboardInput.ts  # Computer keyboard MIDI mapping
    useSynthEngine.ts    # Synth engine context
  /bus            # Audio routing and effect chains
  /utils          # Visualization and helpers
/tests            # Comprehensive test suite (346 tests)
/docs             # Technical documentation
```

### Core Architecture

**Signal Flow:**
```
Computer Keyboard → Voice Manager → [Oscillator 1, 2, 3] → Envelopes
                                                    ↓
                                            Master Gain/Pan
                                                    ↓
                                              Filter (optional)
                                                    ↓
                                              Effects Chain
                                                    ↓
                                            Spectrum Analyzer
                                                    ↓
                                               Speakers
```

**Key Systems:**
- **SynthEngine**: Main orchestrator, manages all subsystems
- **VoiceManager**: Allocates polyphonic voices, applies parameters
- **ParameterManager**: Updates parameters on active and future notes
- **PresetManager**: Saves/loads complete synth state to localStorage
- **LFOManager**: Routes LFO modulation to multiple targets simultaneously

## Technical Documentation

- [Core System Architecture](./docs/CORE_SYSTEM.md) - Audio engine and bus system
- [Oscillators](./docs/OSCILLATORS.md) - Waveform generation and FM synthesis
- [Envelopes & Modulation](./docs/ENVELOPES_AND_MODULATION.md) - ADSR and modulation routing
- [Multi-Target LFO](./docs/MULTI-TARGET-LFO.md) - LFO routing to multiple destinations
- [FM Synthesis](./docs/FM-SYNTHESIS.md) - Frequency modulation implementation
- [Arpeggiator](./docs/ARPEGGIATOR.md) - Pattern-based note generation
- [Sequencer](./docs/SEQUENCER.md) - Step sequencer functionality
- [Keyboard Layout](./docs/KEYBOARD-LAYOUT.md) - US keyboard to MIDI mapping

See [.github/copilot-instructions.md](./.github/copilot-instructions.md) for development guidelines and architectural principles.

## Testing

The project includes a comprehensive test suite with 346 passing tests covering:
- Core audio systems (AudioEngine, VoiceManager, PresetManager)
- Parameter management and real-time updates
- LFO routing and modulation
- UI components (all panels, keyboard, sliders)
- Integration tests for complete workflows

Run tests with:
```bash
npm test              # Run all tests
npm run test:ui       # Run with UI
npm run test:coverage # Generate coverage report
```

CI/CD is automated via GitHub Actions on every pull request.

## Development Roadmap

### Completed Features

#### Phase 1: Foundation
- [x] Project setup with TypeScript and Vite
- [x] Core audio engine with Web Audio API
- [x] Bus architecture for signal routing
- [x] Basic oscillators (Sine, Sawtooth, Square, Triangle)
- [x] ADSR envelope generators

#### Phase 2: Sound Design
- [x] 10 filter types with resonance control
- [x] 9 audio effects with parameter controls
- [x] Dynamic effect chain routing
- [x] Per-oscillator volume, pan, octave, and detune
- [x] FM synthesis (Osc 2 → Osc 1 modulation)

#### Phase 3: Modulation & Sequencing
- [x] Multi-target LFO system (pitch, volume, pan, filter)
- [x] Arpeggiator with 10+ patterns and chord progressions
- [x] Step sequencer with multiple playback modes
- [x] Real-time parameter updates on sustained notes
- [x] Polyphonic voice management

#### Phase 4: User Interface
- [x] React-based full synthesizer UI
- [x] Visual waveform analyzers (3 oscillators + master spectrum)
- [x] Computer keyboard input (US layout Z-' and Q-])
- [x] Mouse-playable virtual keyboard
- [x] All parameter panels with real-time feedback
- [x] Preset system with save/load functionality
- [x] 50+ factory presets

#### Phase 5: Quality & Deployment
- [x] Comprehensive test suite (346 tests, 100% passing)
- [x] GitHub Actions CI/CD pipeline
- [x] Automated deployment to GitHub Pages
- [x] Test coverage reporting
- [x] Clean documentation

### Future Enhancements

- [ ] MIDI controller support (Web MIDI API)
- [ ] Audio recording and WAV export
- [ ] Additional oscillator waveforms (noise, custom wavetables)
- [ ] Visual modulation matrix
- [ ] Additional envelope shapes (multi-stage, exponential curves)
- [ ] Effect preset system (save individual effect chains)
- [ ] Drag-and-drop preset import/export
- [ ] Visual patch cable routing system
- [ ] Performance optimizations for lower-end devices

## Contributing

This is a learning project, but suggestions and improvements are welcome!

## License

MIT License - Feel free to learn from and build upon this project.

---

**Happy Sound Designing!**
