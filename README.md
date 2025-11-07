# Modular Synthesizer - A Learning Journey

A modular synthesizer built with TypeScript and Web Audio API, focusing on reusable components and dynamic effect routing.

## Live Demo

**Try it now: [https://blcoyote.github.io/synth.js/](https://blcoyote.github.io/synth.js/)**

The synthesizer is deployed and available online via GitHub Pages. No installation required - just open the link and start making sounds!

## Project Philosophy

This project is designed as a learning journey to understand:

- Digital Signal Processing (DSP)
- Audio synthesis and sound design
- Modular architecture patterns
- Real-time audio processing
- Web Audio API capabilities

## Key Features

- **Modular Components**: Reusable oscillators, filters, and effects
- **Dynamic Bus System**: Add/remove effects on the fly
- **Real-time Audio**: Low-latency sound generation and processing
- **Extensible Architecture**: Easy to add new components
- **Educational Focus**: Well-documented code for learning

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

## Project Structure

```
/src
  /core           # Core audio engine and context
  /components
    /oscillators  # Sound generators
    /filters      # Frequency filters
    /effects      # Audio effects
    /envelopes    # Envelope generators
    /modulation   # LFOs and modulators
  /bus            # Audio routing system
  /ui             # User interface
  /utils          # Helper functions
/examples         # Example patches
/tests            # Tests
/docs             # Documentation
```

## Core Concepts

### Components

All audio components follow a consistent interface:

- Connect/disconnect to other components
- Parameter control with validation
- Enable/disable functionality
- Type-safe implementation

### Bus System

The bus system allows dynamic signal routing:

- **Master Bus**: Final output destination
- **Aux Buses**: Parallel effect processing
- **Insert Effects**: Serial signal chain
- **Send/Return**: Wet/dry mix control

### Parameters

All parameters feature:

- Min/max range validation
- Smooth value transitions
- Automation support
- Real-time modification

## Documentation

See [PROJECT_RULES.md](./PROJECT_RULES.md) for detailed development guidelines and architecture decisions.

## Learning Resources

- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Digital Signal Processing Basics](https://en.wikipedia.org/wiki/Digital_signal_processing)
- [Synthesizer Fundamentals](https://en.wikipedia.org/wiki/Synthesizer)

## Development Roadmap

- [x] Project setup and rules
- [ ] Core audio context and bus architecture
- [ ] Basic oscillators
- [ ] Envelope generators
- [ ] Filters
- [ ] Effects (delay, reverb, distortion)
- [ ] Modulation sources
- [ ] User interface
- [ ] Preset system
- [ ] Advanced features

## Contributing

This is a learning project, but suggestions and improvements are welcome!

## License

MIT License - Feel free to learn from and build upon this project.

---

**Happy Sound Designing!**
