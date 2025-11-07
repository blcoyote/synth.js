# Modular Synthesizer Project Rules & Guidelines

## Project Vision
A learning journey in building a modular synthesizer with reusable components and dynamic effect routing.

## ⚠️ CRITICAL: Clean Architecture First

**When building NEW features or components:**
- Design state structure BEFORE implementation (show architecture first)
- Use modular state system (4-6 grouped objects, not scattered variables)
- Keep new files under 300 lines (split if growing larger)
- Use dependency injection (pass dependencies, don't import globals)
- Follow single responsibility principle

**When modifying EXISTING code:**
- DON'T trigger large refactors unless explicitly requested
- Follow existing patterns in the file you're editing
- Make surgical changes only
- If you notice architectural issues, MENTION them but don't fix without asking
- Respect the current structure while suggesting improvements for the future

**Red flags to alert the user about (but don't auto-fix):**
- 🚩 File approaching 400+ lines
- 🚩 More than 10 imports from different modules
- 🚩 Tight coupling or circular dependencies forming
- 🚩 State scattered across many files

## Important Development Notes

### Terminal Usage
- PowerShell is now available and working correctly
- Use standard PowerShell for terminal commands
- Note: Avoid bash-style syntax (&&) - use PowerShell

## Core Principles

### 1. Modularity & Clean Architecture
- **Every NEW component must be self-contained and reusable**
- **NEW files should be kept under 300 lines** (suggest splitting if larger)
- **NEW features use dependency injection** (pass dependencies as parameters, not globals)
- Components should follow a consistent interface pattern
- No tight coupling between modules
- Each module should be testable in isolation
- **For EXISTING large files**: Make surgical edits only, don't refactor without permission

### 2. Bus Architecture
- **Central audio bus system for signal routing**
- Effects can be added/removed dynamically at runtime
- Support for multiple buses (master, aux, group buses)
- Signal flow must be clearly traceable

### 3. Component Design Rules
- **Each NEW component must have:**
  - Clear input/output connections
  - Standardized parameter controls
  - Enable/disable functionality
  - Visual feedback capability
  - Documentation of purpose and parameters
  - Dependencies passed via constructor (dependency injection)
  - Single, focused responsibility
- **When editing EXISTING components**: Follow established patterns, make minimal changes

### 4. Code Organization

#### Directory Structure
```
/src
  /core           # Core audio engine and bus system
  /state          # MODULAR STATE MANAGEMENT (separate from logic)
    audioState.ts         # Audio routing, effects, filters
    visualizationState.ts # Analysers and visualizers
    modulationState.ts    # LFO, sequencer, arpeggiator
    voiceState.ts         # Voices and oscillator configs
    index.ts              # Barrel exports
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

#### State Management Architecture
**CRITICAL: State must be clean, modular, and separate from application logic**

**For NEW features and components:**
- All application state lives in `/src/state/` directory
- State modules group related functionality (audio, visualization, modulation, voices)
- Each state module is a singleton class instance with private fields and public getters/setters
- State is imported as grouped objects, NOT individual variables
- Design state structure BEFORE writing implementation code

**For EXISTING code:**
- Use existing state patterns from `/src/state/` modules
- Don't create new scattered state variables
- Don't refactor existing state structure without explicit request

**State Module Pattern:**
```typescript
// state/audioState.ts
class AudioStateManager {
  private _masterBus: BusType | null = null;
  public filterSettings = { cutoff: 2000, resonance: 1.0 };
  
  get masterBus(): BusType {
    if (!this._masterBus) throw new Error('Not initialized');
    return this._masterBus;
  }
  
  setMasterBus(bus: BusType) {
    this._masterBus = bus;
  }
}

export const audioState = new AudioStateManager();
```

**Usage in Application Code:**
```typescript
// CORRECT: Import grouped state modules
import { audioState, modulationState, voiceState } from './state';

// Use with dot notation
audioState.masterBus.connect(destination);
modulationState.lfo.start();
voiceState.activeVoices.set(note, voice);

// WRONG: Don't import individual state variables
import { masterBus, lfo, activeVoices } from './state'; // ❌ NEVER DO THIS
```

**State Rules (for NEW code):**
1. **Separation of Concerns**: State modules contain ONLY data and accessors, NO business logic
2. **Encapsulation**: Use private fields with getters/setters for controlled access
3. **Type Safety**: All state must have proper TypeScript types and interfaces
4. **Null Safety**: Getters throw descriptive errors if accessed before initialization
5. **No Exports Pollution**: Export 4-5 state objects, NOT 40+ individual variables
6. **Immutable Config Objects**: Use readonly configuration objects where appropriate
7. **Clear Boundaries**: State initialization happens separately from state usage

**State Rules (for EXISTING code):**
1. Use existing state modules from `/src/state/`
2. Import grouped state objects (audioState, modulationState, etc.)
3. Don't create parallel state systems
4. If state is missing, add to appropriate existing module

**Benefits:**
- Clean imports (4 objects vs 40+ variables)
- Better IDE autocomplete and discoverability
- Easier to test and mock
- Clear data flow
- Prevents circular dependencies
- Makes refactoring safer

### 5. Coding Standards

#### Naming Conventions
- **Components**: PascalCase (e.g., `SineOscillator`, `ReverbEffect`)
- **Functions**: camelCase (e.g., `connectTo`, `setParameter`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_GAIN`, `SAMPLE_RATE`)
- **Private methods**: prefix with underscore (e.g., `_processAudio`)

#### Code Style Rules
- **No icons/emoticons in code, documentation, or README files**
- Keep code and documentation professional and clean
- Use clear, descriptive text instead of visual symbols
- Emoticons are allowed in chat conversations only

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

#### Real-Time Parameter Updates
**CRITICAL: All parameter changes must affect actively playing notes (sustained notes)**

When adding UI controls for NEW parameters:
1. **Update the config/state** (for future notes)
2. **Update all active voices** (for currently playing notes)
3. **Exception**: Parameters that should only apply on note trigger (like LFO trigger mode)

**Pattern for real-time updates:**
```typescript
slider.addEventListener('input', () => {
  // 1. Update config (for new notes)
  const config = voiceState.oscillatorConfigs.get(oscNum)!;
  config.someParameter = newValue;
  
  // 2. Update active voices (for sustained notes)
  voiceState.activeVoices.forEach((voice) => {
    voice.oscillators.forEach((oscData) => {
      if (oscData.oscNum === oscNum) {
        oscData.oscillator.setParameter('someParameter', newValue);
        // OR: oscData.panNode.pan.value = newValue;
        // OR: oscData.envelope.setParameter('attack', newValue);
      }
    });
  });
});
```

**Examples of parameters that MUST update in real-time:**
- ✅ Volume, Pan, Detune, Octave
- ✅ FM Depth, Filter Cutoff, Filter Resonance
- ✅ Envelope ADSR (attack, decay, sustain, release)
- ✅ LFO Rate, LFO Depth (in free-running mode)
- ✅ Effect parameters (reverb mix, delay time, etc.)

**Examples of parameters that should NOT update existing notes:**
- ❌ Waveform type (OscillatorNode is immutable once created)
- ❌ LFO trigger mode settings (only affects next note)

**Testing requirement:**
- When adding a new parameter control, test it while holding a note
- The parameter should respond immediately during the sustain phase
- Document in comments if a parameter intentionally doesn't update live

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

### 11a. State Management Best Practices
**When creating NEW state for new features:**

1. **Always use the modular state system** in `/src/state/`
2. **Group related state** into logical modules (audio, visualization, modulation, voices)
3. **Keep state separate** from business logic and UI code
4. **Use class-based state managers** with private fields and public accessors
5. **Provide safe getters** that throw descriptive errors for uninitialized state
6. **Export singleton instances**, not classes or individual variables
7. **Document state structure** with clear comments and TypeScript types

**When working with EXISTING code:**
- Use state from existing `/src/state/` modules
- Import grouped state objects: `import { audioState, modulationState } from './state'`
- Access via dot notation: `audioState.masterBus`, `modulationState.lfo`
- If new state is needed, add to appropriate existing module
- DON'T refactor large existing files without explicit permission

**When refactoring is explicitly requested:**
- Replace scattered state variables with grouped state modules
- Convert individual exports to object properties
- Use automated scripts for bulk replacements in large files
- Test thoroughly after state migrations

**Anti-patterns to avoid in NEW code:**
- ❌ Exporting 40+ individual variables from a state file
- ❌ Mixing state declarations with business logic
- ❌ Direct mutation of state without getters/setters
- ❌ Accessing state before initialization without null checks
- ❌ Creating circular dependencies between state and logic
- ❌ Creating new scattered state instead of using `/src/state/` modules

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
