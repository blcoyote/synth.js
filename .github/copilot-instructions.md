# Modular Synthesizer Project Rules & Guidelines

## Project Vision
A learning journey in building a modular synthesizer with reusable components and dynamic effect routing.

## Important Development Notes

### Terminal Usage
- PowerShell is now available and working correctly
- Use standard PowerShell or cmd.exe for terminal commands
- Note: Avoid bash-style syntax (&&) - use PowerShell or cmd syntax

## Core Principles

### 1. Modularity
- **Every component must be self-contained and reusable**
- Components should follow a consistent interface pattern
- No tight coupling between modules
- Each module should be testable in isolation

### 2. Bus Architecture
- **Central audio bus system for signal routing**
- Effects can be added/removed dynamically at runtime
- Support for multiple buses (master, aux, group buses)
- Signal flow must be clearly traceable

### 3. Component Design Rules
- **Each component must have:**
  - Clear input/output connections
  - Standardized parameter controls
  - Enable/disable functionality
  - Visual feedback capability
  - Documentation of purpose and parameters

### 4. Code Organization

#### Directory Structure
```
/src
  /core           # Core audio engine and bus system
  /components
    /oscillators  # Sound generators (sine, saw, square, etc.)
    /filters      # Frequency filters (lowpass, highpass, etc.)
    /effects      # Audio effects (reverb, delay, distortion, etc.)
    /envelopes    # ADSR and other envelope generators
    /modulation   # LFOs, sequencers, etc.
  /bus            # Audio bus and routing system
  /ui             # User interface components
  /utils          # Helper functions and utilities
/examples         # Example patches and demonstrations
/tests            # Unit and integration tests
/docs             # Documentation and tutorials
```

### 5. Coding Standards

#### Naming Conventions
- **Components**: PascalCase (e.g., `SineOscillator`, `ReverbEffect`)
- **Functions**: camelCase (e.g., `connectTo`, `setParameter`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_GAIN`, `SAMPLE_RATE`)
- **Private methods**: prefix with underscore (e.g., `_processAudio`)

#### Component Interface Template
Every audio component must implement:
```typescript
interface AudioComponent {
  // Core functionality
  connect(destination: AudioNode | AudioComponent): void;
  disconnect(): void;
  
  // Parameter control
  setParameter(name: string, value: number): void;
  getParameter(name: string): number;
  
  // State management
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  
  // Metadata
  getName(): string;
  getType(): string;
  getParameters(): ParameterDescriptor[];
}
```

### 6. Bus System Rules

#### Bus Capabilities
- **Master Bus**: Final output, always present
- **Aux Buses**: For parallel effects processing
- **Group Buses**: For grouping similar sounds
- **Insert Effects**: Serial processing in the signal chain
- **Send/Return Effects**: Parallel processing with dry/wet mix

#### Dynamic Effect Management
```typescript
// Effects must be hot-swappable
bus.addEffect(effect, position?);
bus.removeEffect(effectId);
bus.moveEffect(effectId, newPosition);
bus.bypassEffect(effectId, bypass);
```

### 7. Parameter System

#### Parameter Requirements
- All parameters must have min/max ranges
- Default values must be sensible
- Parameters should support automation
- Value changes must be smooth (no clicks/pops)

#### Parameter Types
- **Continuous**: Frequency, gain, time
- **Discrete**: Waveform type, filter mode
- **Boolean**: On/off, bypass states

### 8. Performance Guidelines
- **Optimize for real-time audio processing**
- Minimize garbage collection during audio processing
- Use object pooling for frequently created/destroyed objects
- Profile regularly, especially effect chains
- Target: < 5ms latency for user interactions

### 9. Testing Requirements
- **Unit tests for each component**
- Integration tests for signal routing
- Audio quality tests (THD, frequency response)
- Performance benchmarks
- Edge case handling (divide by zero, NaN values)

### 10. Documentation Standards
- **Every component needs:**
  - Purpose and use case description
  - Parameter documentation with ranges
  - Code examples
  - Audio examples (where applicable)
  - Block diagram of signal flow

### 11. Learning Journey Principles
- **Code should be educational**
- Prefer clarity over clever optimizations (unless performance-critical)
- Include comments explaining DSP concepts
- Provide examples from simple to complex
- Document design decisions and trade-offs

### 12. Version Control
- **Commit messages should be descriptive**
- One feature per commit when possible
- Tag major milestones
- Keep main branch stable
- Use branches for experimental features

### 13. Technology Stack

#### Primary Language
- **JavaScript/TypeScript** (chose TypeScript for better type safety)

#### Audio Engine
- **Web Audio API** for core audio processing
- Browser-based, no external dependencies for audio

#### Potential Libraries (evaluate as needed)
- Tone.js (reference, but build our own for learning)
- Tuna.js (audio effects reference)
- Web Audio API polyfills for compatibility

### 14. Project Phases

#### Phase 1: Foundation
- [ ] Core audio context setup
- [ ] Basic bus architecture
- [ ] Simple oscillators (sine, saw, square)
- [ ] Basic gain control

#### Phase 2: Expansion
- [ ] Filters (lowpass, highpass, bandpass)
- [ ] Envelope generators (ADSR)
- [ ] Basic effects (delay, distortion)
- [ ] Dynamic effect routing

#### Phase 3: Advanced Features
- [ ] Advanced effects (reverb, chorus, flanger)
- [ ] Modulation sources (LFO, sequencer)
- [ ] Preset system
- [ ] Visual UI

#### Phase 4: Polish
- [ ] Performance optimization
- [ ] Comprehensive documentation
- [ ] Example patches library
- [ ] MIDI integration (optional)

### 15. Extension Points
The system should be easily extensible:
- Custom oscillator waveforms
- User-defined effects
- Third-party component integration
- Plugin architecture consideration

---

## Getting Started
1. Set up development environment
2. Review Web Audio API documentation
3. Start with Phase 1: Foundation
4. Build iteratively, test continuously
5. Document as you go

## Resources to Study
- Web Audio API specification
- Digital Signal Processing fundamentals
- Synthesizer architecture patterns
- Audio effect algorithms
- Real-time audio programming best practices

---

*Remember: This is a learning journey. It's okay to refactor, okay to make mistakes, and essential to understand why things work the way they do.*
