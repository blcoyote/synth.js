# Modular Synthesizer - Documentation

## Overview

A modular web-based synthesizer built with React, TypeScript, and the Web Audio API.

## Quick Start

The dev server runs at: http://localhost:3000/synth.js/

## Architecture

### Core Components
- **AudioEngine**: Singleton managing Web Audio context
- **SynthEngine**: Main coordinator for audio processing
- **VoiceManager**: Polyphonic voice allocation and management
- **ParameterManager**: Real-time parameter updates

### UI Components (React)
- Slider, Keyboard, Oscillator panels, Filter panel, Envelope controls
- React Context for state management
- Real-time parameter updates on sustained notes

## File Structure

```
src/
├── core/                      # Core audio engine
│   ├── AudioEngine.ts        # Web Audio context singleton
│   ├── SynthEngine.ts        # Main coordinator
│   ├── VoiceManager.ts       # Voice management
│   └── ParameterManager.ts   # Parameter control
├── ui/                       # React components
│   ├── common/               # Reusable components
│   ├── App.tsx              # Main React app
│   └── ...                  # Feature panels
├── context/
│   └── SynthContext.tsx     # React context
├── hooks/                   # Custom React hooks
└── components/              # Audio components (oscillators, filters, effects)

index.html                   # Main entry point
```

## Testing

Run tests with: `npm test`

## Features

- 3 oscillators with multiple waveforms (sine, sawtooth, square, triangle)
- Master filter with multiple types (lowpass, highpass, bandpass, etc.)
- ADSR envelopes
- Audio effects (reverb, delay, distortion, chorus, shimmer)
- LFO modulation system
- Arpeggiator and sequencer
- Virtual keyboard input
- Preset management
- Real-time parameter updates

## Development

- **Dev server**: `npm run dev`
- **Build**: `npm run build`
- **Preview**: `npm run preview`
- **Tests**: `npm test`
- **Coverage**: `npm run coverage`

## Documentation

See individual documentation files in this directory for details on specific features:
- `ARPEGGIATOR.md` - Arpeggiator functionality
- `SEQUENCER.md` - Step sequencer
- `MULTI-TARGET-LFO.md` - LFO modulation system
- `FM-SYNTHESIS.md` - Frequency modulation synthesis
- `ENVELOPES_AND_MODULATION.md` - Envelope generators
- `OSCILLATORS.md` - Oscillator documentation
- `CORE_SYSTEM.md` - Core architecture

---

**Current Status**: Fully functional modular synthesizer with React UI
