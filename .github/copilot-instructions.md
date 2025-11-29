# Modular Synthesizer - AI Coding Instructions

## Architecture Overview

This is a **polyphonic synthesizer** built with React/TypeScript and Web Audio API. The system uses a **modular state architecture** with dependency injection and real-time audio parameter updates.

### Core System Flow
1. **SynthEngine** coordinates all managers and initializes Web Audio context
2. **State modules** (4 singletons) manage data separately from business logic  
3. **Managers** handle audio processing: VoiceManager, EffectsManager, LFOManager, etc.
4. **React UI** connects to managers via SynthContext and state modules

### Critical Architectural Rules

**State Management (ESSENTIAL):**
- Import grouped state objects: `import { audioState, voiceState, modulationState, visualizationState } from './state'`
- Access via dot notation: `audioState.filterSettings.cutoff`, `voiceState.activeVoices`
- NEVER import individual state variables
- State modules use class instances with private fields and getters/setters

**Real-time Audio Updates:**
- ALL parameter changes must update both config AND active voices
- Pattern: Update `voiceState.oscillatorConfigs.get(oscNum)` AND `voiceState.activeVoices.forEach(voice => ...)`
- Exception: Immutable parameters like waveform type

**Component Design:**
- Effects inherit from `BaseEffect` with wet/dry mix and bypass
- Use dependency injection: pass `AudioEngine` to constructors, don't import globally
- All audio components implement standard interface: `connect()`, `disconnect()`, `setParameter()`

**Testing:**
- Mock Web Audio API (see `tests/setup.ts`)
- Test OUR logic, not browser APIs
- Focus on state changes and component behavior

## Key Development Patterns

### 1. Adding New Audio Effects
```typescript
// Extend BaseEffect (provides wet/dry mix, bypass)
export class MyEffect extends BaseEffect {
  constructor() {
    super('My Effect', 'my-effect');
    // Create effect nodes
    this.effectNode = this.engine.createBiquadFilter();
    // Connect wet path
    this.connectWetPath(this.effectNode);
  }
}
```

### 2. State Module Pattern
```typescript
// state/myState.ts
class MyStateManager {
  private _data: SomeType | null = null;
  public settings = { param1: 0, param2: 100 };
  
  get data(): SomeType {
    if (!this._data) throw new Error('Not initialized');
    return this._data;
  }
  
  setData(data: SomeType) { this._data = data; }
}
export const myState = new MyStateManager();
```

### 3. Real-time Parameter Updates
```typescript
// Update both config and active voices
const config = voiceState.oscillatorConfigs.get(oscNum)!;
config.volume = newValue;

voiceState.activeVoices.forEach((voice) => {
  voice.oscillators.forEach((oscData) => {
    if (oscData.oscNum === oscNum) {
      oscData.gainNode.gain.value = newValue;
    }
  });
});
```

### 4. Manager Dependencies
```typescript
// Managers receive dependencies via constructor
export class MyManager {
  constructor(
    private audioEngine: AudioEngine,
    private otherDependency: SomeService
  ) {
    // Initialize with injected dependencies
  }
}
```

## Project Structure

```
src/
  core/           # SynthEngine, managers (VoiceManager, EffectsManager, etc.)
  state/          # 4 state modules: audioState, voiceState, modulationState, visualizationState
  components/     # Audio components (effects/, filters/, oscillators/, envelopes/)
  ui/             # React components
  context/        # SynthContext (React context for accessing managers)
```

## Development Workflow

**Start Development:**
```bash
npm install
npm run dev          # Development server
```

**Testing:**
```bash
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:ui      # Visual test UI
```

**Build & Deploy:**
```bash
npm run build        # Production build
npm run preview      # Preview build locally
```

## Common Integration Points

**Adding UI Controls:**
1. Import state modules: `import { audioState, voiceState } from '../state'`
2. Access via SynthContext: `const { engine } = useSynthEngine()`
3. Update both state and active voices for real-time response

**Web Audio Context Access:**
- Get via `AudioEngine.getInstance().getContext()`
- Always use the singleton - don't create new contexts
- Context initialized by SynthEngine

**Effects Chain:**
- Use `audioState.getEffectsManager()` to add/remove/reorder effects
- Effects connect serially: input → effect1 → effect2 → output
- Each effect has individual bypass control

## Critical Files to Understand

- `src/core/SynthEngine.ts` - Main coordinator, initialization sequence
- `src/state/index.ts` - State module exports and initialization pattern
- `src/components/effects/BaseEffect.ts` - Effect component interface
- `src/context/SynthContext.tsx` - React context pattern
- `tests/setup.ts` - Web Audio API mocking for tests
