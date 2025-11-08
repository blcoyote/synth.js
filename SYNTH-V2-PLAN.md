# Synth V2: Rebuild Plan

## Vision
Build a clean, modular synthesizer from scratch using everything learned from V1, with proper architecture from day one.

## Goals
1. **Clean Code**: Every file under 300 lines, single responsibility
2. **Modular State**: State management done right from the start
3. **Real-Time Everything**: All parameters work on sustained notes
4. **Testable**: Unit tests as we build, not after
5. **Maintainable**: Easy to add features without breaking existing code
6. **Educational**: Code that teaches DSP and synthesis concepts

## What We Keep (Reuse from V1)
These components are already well-designed and modular:

### ✅ Core Infrastructure (Reuse As-Is)
- `src/core/AudioEngine.ts` - Singleton audio context manager
- `src/core/types.ts` - Type definitions
- `src/bus/AudioBus.ts` - Audio routing
- `src/bus/BusManager.ts` - Bus management
- `src/bus/EffectsChain.ts` - Effects chain

### ✅ Oscillators (Reuse As-Is)
- `src/components/oscillators/BaseOscillator.ts`
- `src/components/oscillators/SineOscillator.ts`
- `src/components/oscillators/SawtoothOscillator.ts`
- `src/components/oscillators/SquareOscillator.ts`
- `src/components/oscillators/TriangleOscillator.ts`

### ✅ Filters (Reuse As-Is)
- All filters in `src/components/filters/` are well-structured
- BaseFilter pattern is good

### ✅ Effects (Reuse As-Is)
- All effects in `src/components/effects/` follow good patterns
- BaseEffect abstraction works well

### ✅ Envelopes (Reuse As-Is)
- `src/components/envelopes/ADSREnvelope.ts` is solid

### ✅ Modulation (Reuse As-Is)
- `src/components/modulation/LFO.ts`
- `src/components/modulation/MultiTargetLFO.ts`
- Sequencer and Arpeggiator

### ✅ State System (Reuse As-Is)
- `src/state/audioState.ts`
- `src/state/visualizationState.ts`
- `src/state/modulationState.ts`
- `src/state/voiceState.ts`
This is our new clean state architecture - keep it!

### ✅ Visualizers (Minor Refactor)
- `src/utils/WaveSurferVisualizer.ts` - Keep triggered oscilloscope improvements
- May need minor cleanup but core is good

## What We Rebuild (From Scratch)

### 🔨 Main Synth Orchestration
**Problem**: `src/synth.ts` is 2679 lines - too large, does too much

**Solution**: Break into modules

#### New Structure:
```
/src
  /synth-v2
    /core
      SynthEngine.ts        # Main orchestrator (150 lines max)
      VoiceManager.ts       # Voice lifecycle management (200 lines)
      ParameterManager.ts   # Real-time parameter updates (200 lines)
    /ui
      UIManager.ts          # Main UI coordinator (150 lines)
      OscillatorUI.ts       # Oscillator controls (200 lines)
      EnvelopeUI.ts         # Envelope controls (150 lines)
      FilterUI.ts           # Filter controls (150 lines)
      ModulationUI.ts       # LFO/Mod controls (200 lines)
      EffectsUI.ts          # Effects controls (200 lines)
      SequencerUI.ts        # Sequencer/Arp controls (200 lines)
      KeyboardUI.ts         # Virtual keyboard (150 lines)
    /presets
      PresetManager.ts      # Load/save presets (150 lines)
      presetDefinitions.ts  # Preset data
    index.ts                # Main entry point (50 lines)
```

### 🔨 Voice Management System
**Problem**: Voice creation logic duplicated in multiple places

**Solution**: Single VoiceManager class

```typescript
// synth-v2/core/VoiceManager.ts
export class VoiceManager {
  private activeVoices: Map<number, Voice>;
  private voicePool: Voice[]; // Object pooling for performance
  
  playNote(noteIndex: number, velocity: number): void
  releaseNote(noteIndex: number): void
  stopAllNotes(): void
  updateParameter(oscNum: number, param: string, value: number): void
  
  // Handles all real-time parameter updates to active voices
}
```

### 🔨 Parameter Update System
**Problem**: Real-time updates scattered across UI code

**Solution**: Centralized ParameterManager

```typescript
// synth-v2/core/ParameterManager.ts
export class ParameterManager {
  // Single source of truth for parameter updates
  updateOscillatorParameter(oscNum: number, param: string, value: number): void
  updateEnvelopeParameter(envNum: number, param: string, value: number): void
  updateFilterParameter(param: string, value: number): void
  updateLFOParameter(param: string, value: number): void
  
  // Automatically updates both config AND active voices
  // No more forgetting to update active voices!
}
```

### 🔨 UI System
**Problem**: 2000+ lines of UI code mixed with logic

**Solution**: Separate UI modules, each focused

```typescript
// synth-v2/ui/OscillatorUI.ts (200 lines)
export class OscillatorUI {
  constructor(
    private oscNum: number,
    private paramManager: ParameterManager
  ) {}
  
  initialize(): void {
    this.setupWaveformButtons();
    this.setupOctaveControl();
    this.setupDetuneControl();
    this.setupVolumeControl();
    this.setupPanControl();
    this.setupFMControls();
  }
  
  private setupVolumeControl(): void {
    // All real-time updates delegated to paramManager
  }
}
```

## Implementation Plan

### Phase 1: Foundation (Week 1)
**Goal**: Core architecture and one working oscillator

1. **Create new directory structure**
   - Set up `/src/synth-v2/` folder
   - Copy reusable components to new structure
   - Keep V1 running alongside during development

2. **Build SynthEngine**
   - Initialize AudioEngine
   - Set up state modules
   - Create VoiceManager instance
   - Create ParameterManager instance
   - ~150 lines, single responsibility

3. **Build VoiceManager**
   - Voice lifecycle (create, play, release, cleanup)
   - Object pooling for performance
   - Integration with state modules
   - ~200 lines

4. **Build ParameterManager**
   - Real-time parameter update logic
   - Update config + active voices pattern
   - Clean API for UI modules
   - ~200 lines

5. **Build basic OscillatorUI**
   - Single oscillator controls
   - Wired to ParameterManager
   - Test real-time updates
   - ~150 lines to start

6. **Test Phase 1**
   - Can play notes with 1 oscillator
   - All parameters work in real-time
   - No memory leaks
   - Clean, readable code

### Phase 2: Full Oscillator Section (Week 2)
**Goal**: All three oscillators with FM synthesis

1. **Complete OscillatorUI**
   - All three oscillators
   - FM synthesis controls
   - Waveform visualization integration
   - ~200 lines total

2. **Build EnvelopeUI**
   - ADSR controls for all 3 oscillators
   - Real-time updates
   - ~150 lines

3. **Update VoiceManager**
   - Handle 3 oscillators per voice
   - FM modulation routing
   - ~250 lines (added complexity)

4. **Test Phase 2**
   - 3 oscillators work independently
   - FM synthesis functional
   - Envelopes work in real-time
   - Polyphony works

### Phase 3: Filters & Effects (Week 3)
**Goal**: Signal processing chain

1. **Build FilterUI**
   - Filter type selection
   - Cutoff and resonance controls
   - Filter visualization
   - ~150 lines

2. **Build EffectsUI**
   - Effect selection/ordering
   - Parameter controls per effect
   - Bypass/enable toggles
   - ~200 lines

3. **Test Phase 3**
   - Filters work in real-time
   - Effects chain functional
   - Can reorder effects
   - CPU usage acceptable

### Phase 4: Modulation (Week 4)
**Goal**: LFO, Sequencer, Arpeggiator

1. **Build ModulationUI**
   - LFO controls and routing
   - Multi-target LFO setup
   - Trigger vs Free mode
   - ~200 lines

2. **Build SequencerUI**
   - Step sequencer controls
   - Pattern management
   - ~200 lines

3. **Test Phase 4**
   - LFO modulates all targets
   - Sequencer plays patterns
   - Arpeggiator works
   - Trigger mode respects rules

### Phase 5: Presets & Polish (Week 5)
**Goal**: Preset system and final touches

1. **Build PresetManager**
   - Load/save presets
   - Import V1 presets (convert format)
   - Preset browser
   - ~150 lines

2. **Build KeyboardUI**
   - Virtual keyboard
   - MIDI support (if time)
   - ~150 lines

3. **Build UIManager**
   - Coordinates all UI modules
   - Handles tab switching
   - Global controls (master volume)
   - ~150 lines

4. **Polish**
   - Performance optimization
   - Visual improvements
   - Documentation
   - Tutorial/help system

### Phase 6: Testing & Launch (Week 6)
**Goal**: Production ready

1. **Unit Tests**
   - VoiceManager tests
   - ParameterManager tests
   - State module tests
   - ~500 lines of tests

2. **Integration Tests**
   - Full synth workflow tests
   - Preset load/save tests
   - ~300 lines of tests

3. **Performance Testing**
   - Memory leak detection
   - CPU profiling
   - Voice limit testing

4. **Documentation**
   - API documentation
   - User guide
   - Architecture document

5. **Migration Guide**
   - How to switch from V1 to V2
   - Preset conversion tool
   - Feature comparison

## Code Quality Rules

### Every File Must:
1. **Be under 300 lines** (ideally under 200)
2. **Have single responsibility** (does ONE thing well)
3. **Use dependency injection** (no global imports)
4. **Have TypeScript types** (no `any` types)
5. **Include JSDoc comments** (explain WHY, not WHAT)
6. **Support real-time updates** (if it's a parameter)

### Every Class Must:
1. **Have a clear purpose** (can describe in one sentence)
2. **Have minimal dependencies** (constructor injection only)
3. **Be testable** (no side effects in constructor)
4. **Follow interface** (implements a clear contract)

### Every Function Must:
1. **Do one thing** (can't be broken into smaller functions)
2. **Have descriptive name** (verb + noun pattern)
3. **Have max 3 parameters** (use options object if more)
4. **Return early** (guard clauses at top)

## File Size Targets

| Component | Target Lines | Max Lines | Complexity |
|-----------|-------------|-----------|------------|
| SynthEngine | 120 | 150 | Low |
| VoiceManager | 180 | 250 | Medium |
| ParameterManager | 150 | 200 | Medium |
| OscillatorUI | 180 | 200 | Low |
| EnvelopeUI | 120 | 150 | Low |
| FilterUI | 120 | 150 | Low |
| ModulationUI | 180 | 200 | Medium |
| EffectsUI | 180 | 200 | Low |
| SequencerUI | 180 | 200 | Medium |
| PresetManager | 120 | 150 | Low |
| UIManager | 100 | 150 | Low |

**Total: ~1,600 lines** (vs 2,679 in V1 synth.ts)

## Testing Strategy

### Unit Tests (As We Build)
```typescript
// tests/unit/synth-v2/core/VoiceManager.test.ts
describe('VoiceManager', () => {
  it('should create voice on playNote');
  it('should update all active voices on parameter change');
  it('should clean up voice on releaseNote');
  it('should handle polyphony correctly');
  it('should prevent memory leaks');
});
```

### Integration Tests (End of Each Phase)
```typescript
// tests/integration/synth-v2/phase1.test.ts
describe('Phase 1: Foundation', () => {
  it('should play a note with oscillator 1');
  it('should update volume in real-time');
  it('should handle note off correctly');
});
```

## Success Metrics

### Code Quality
- ✅ All files under 300 lines
- ✅ No circular dependencies
- ✅ 100% TypeScript (no `any`)
- ✅ All public APIs documented
- ✅ Test coverage > 80%

### Functionality
- ✅ All V1 features work in V2
- ✅ All parameters update in real-time
- ✅ No audio glitches or clicks
- ✅ Can load V1 presets (converted)

### Performance
- ✅ Supports 8+ voice polyphony
- ✅ No memory leaks (24hr test)
- ✅ CPU usage < 20% (at 8 voices)
- ✅ Startup time < 1 second

### Maintainability
- ✅ New developer can understand code in 1 hour
- ✅ Can add new effect in < 50 lines
- ✅ Can add new parameter with real-time updates in < 20 lines
- ✅ No "god classes" or "god functions"

## Migration Path (When V2 is Ready)

1. **Keep V1 Running**
   - Don't delete V1 code
   - Keep as `src/synth-legacy.ts`
   - Useful for reference

2. **Create V2 Entry Points**
   - `synth-v2.html` - New UI
   - `src/synth-v2/index.ts` - New entry

3. **Preset Conversion Tool**
   - Script to convert V1 presets to V2 format
   - Validate all presets work

4. **Side-by-Side Testing**
   - Run both versions
   - Compare output quality
   - Verify feature parity

5. **Gradual Rollout**
   - Beta testers use V2
   - Gather feedback
   - Fix issues
   - Make V2 default

## Key Architectural Improvements Over V1

### 1. Separation of Concerns
**V1**: UI code, logic, and state mixed in one 2679-line file
**V2**: Clear separation - UI modules, core logic, state management

### 2. Real-Time Updates Built-In
**V1**: Had to manually add real-time updates (forgot some)
**V2**: ParameterManager ensures all updates work automatically

### 3. Testability
**V1**: Hard to test (tight coupling, globals)
**V2**: Dependency injection makes testing easy

### 4. Maintainability
**V1**: Adding feature = finding right place in huge file
**V2**: Adding feature = new small module or extend existing

### 5. Performance
**V1**: No object pooling, potential memory leaks
**V2**: Voice pooling, proper cleanup, profiled

### 6. Documentation
**V1**: Minimal comments, hard to understand
**V2**: JSDoc everywhere, architectural docs, examples

## Risks & Mitigation

### Risk: V2 takes too long
**Mitigation**: Build in phases, V1 stays functional, can pause anytime

### Risk: V2 sounds different from V1
**Mitigation**: A/B testing, same audio components (oscillators, filters)

### Risk: Lose features in translation
**Mitigation**: Feature checklist, test each V1 feature in V2

### Risk: Bugs in V2
**Mitigation**: Unit tests from start, integration tests per phase

### Risk: Team prefers V1
**Mitigation**: Keep V1 available, make V2 clearly better (performance, maintainability)

## Framework Decision: React + TypeScript ✅

### Decision: Using React

**CONFIRMED: We're building Synth V2 with React + TypeScript**

This will eliminate the event listener spaghetti and give us clean, modular, testable UI components.

### Framework Comparison

#### Option 1: React (Recommended)
**Pros:**
- ✅ Component-based architecture (perfect for modular UI)
- ✅ Declarative UI (state → UI, no manual DOM manipulation)
- ✅ Huge ecosystem and community
- ✅ TypeScript support is excellent
- ✅ Easy to test components
- ✅ No messy `addEventListener` spaghetti
- ✅ useRef for audio nodes (Web Audio API integration)
- ✅ Context API for shared state (AudioEngine, state modules)
- ✅ Already familiar to most developers

**Cons:**
- ❌ Adds bundle size (~45KB gzipped)
- ❌ Learning curve if not familiar
- ❌ Need build tooling (but we already have Vite)

**Best for**: Complex UIs, team projects, long-term maintenance

#### Option 2: Vue 3
**Pros:**
- ✅ Similar benefits to React
- ✅ Composition API is great for TypeScript
- ✅ Slightly smaller bundle (~35KB gzipped)
- ✅ Template syntax might be easier
- ✅ Reactivity system works well

**Cons:**
- ❌ Smaller ecosystem than React
- ❌ Less common in audio development
- ❌ Slightly less TypeScript support

**Best for**: Cleaner template syntax, smaller bundle size

#### Option 3: Vanilla TypeScript (Current)
**Pros:**
- ✅ No framework overhead
- ✅ Full control
- ✅ Smaller initial bundle
- ✅ No build complexity

**Cons:**
- ❌ Manual DOM manipulation
- ❌ Event listener hell (already experiencing this!)
- ❌ State synchronization bugs
- ❌ Harder to test
- ❌ More boilerplate

**Best for**: Simple UIs, learning projects, maximum performance

### Recommendation: Use React

**Why React for Synth V2:**

1. **No More Event Listener Spaghetti**
```typescript
// BEFORE (Vanilla - V1 style):
const volumeSlider = document.getElementById(`osc${oscNum}-volume`);
volumeSlider.addEventListener('input', () => {
  const config = voiceState.oscillatorConfigs.get(oscNum)!;
  config.volume = parseInt(volumeSlider.value) / 100;
  // Update active voices...
  voiceState.activeVoices.forEach((voice) => {
    // ... 10 more lines
  });
});

// AFTER (React):
function VolumeSlider({ oscNum }: Props) {
  const handleVolumeChange = (value: number) => {
    parameterManager.updateOscillatorParameter(oscNum, 'volume', value);
  };
  
  return <input type="range" onChange={(e) => handleVolumeChange(e.target.value)} />;
}
```

2. **Component Reusability**
```tsx
// Use the same slider for all 3 oscillators
<VolumeSlider oscNum={1} />
<VolumeSlider oscNum={2} />
<VolumeSlider oscNum={3} />

// No copy-paste code!
```

3. **State Management is Built-In**
```tsx
function OscillatorPanel({ oscNum }: Props) {
  const [waveform, setWaveform] = useState('sine');
  const [volume, setVolume] = useState(50);
  
  // UI automatically updates when state changes
  // No manual DOM manipulation needed
}
```

4. **Easier Testing**
```tsx
import { render, fireEvent } from '@testing-library/react';

test('volume slider updates parameter', () => {
  const { getByRole } = render(<VolumeSlider oscNum={1} />);
  const slider = getByRole('slider');
  
  fireEvent.change(slider, { target: { value: 75 } });
  
  expect(parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(1, 'volume', 75);
});
```

### Updated V2 Structure (With React)

```
/src
  /synth-v2
    /core
      SynthEngine.ts        # Audio engine (no UI)
      VoiceManager.ts       # Voice management
      ParameterManager.ts   # Parameter updates
      
    /components           # React components
      /oscillator
        OscillatorPanel.tsx       # Main oscillator panel
        WaveformSelector.tsx      # Waveform buttons
        OctaveSlider.tsx          # Octave control
        DetuneSlider.tsx          # Detune control
        VolumeSlider.tsx          # Volume slider
        PanSlider.tsx             # Pan slider
        FMControls.tsx            # FM synthesis controls
        
      /envelope
        EnvelopePanel.tsx         # ADSR controls
        ADSRSlider.tsx            # Reusable ADSR slider
        
      /filter
        FilterPanel.tsx           # Filter controls
        FilterTypeSelector.tsx    # Filter type dropdown
        CutoffSlider.tsx          # Cutoff frequency
        ResonanceSlider.tsx       # Resonance/Q
        
      /modulation
        LFOPanel.tsx              # LFO controls
        LFOWaveform.tsx           # LFO waveform selector
        LFOTargets.tsx            # Target checkboxes
        
      /effects
        EffectsPanel.tsx          # Effects chain
        EffectSlot.tsx            # Single effect slot
        EffectControls.tsx        # Effect parameters
        
      /keyboard
        VirtualKeyboard.tsx       # Playable keyboard
        Key.tsx                   # Single key component
        
      /common
        Slider.tsx                # Reusable slider component
        Knob.tsx                  # Reusable knob component
        Button.tsx                # Reusable button
        Select.tsx                # Reusable dropdown
        
    /hooks                # Custom React hooks
      useAudioParameter.ts      # Hook for audio parameters
      useSynthEngine.ts         # Hook to access engine
      useVoiceManager.ts        # Hook for voice control
      
    /context              # React context
      SynthContext.tsx          # Global synth state
      
    App.tsx               # Main React app
    index.tsx             # Entry point
```

### Updated Implementation Plan

#### Phase 0: React Setup (3-4 days)
1. **Install React + TypeScript**
   ```bash
   npm install react react-dom
   npm install -D @types/react @types/react-dom
   npm install -D @testing-library/react
   ```

2. **Create React entry point**
   - `synth-v2.html` - HTML shell
   - `src/synth-v2/index.tsx` - React mount
   - `src/synth-v2/App.tsx` - Main component

3. **Set up SynthContext**
   ```tsx
   const SynthContext = createContext<{
     engine: SynthEngine;
     voiceManager: VoiceManager;
     paramManager: ParameterManager;
   }>(null!);
   ```

4. **Create first component**
   - Simple slider component
   - Test React + Audio integration
   - Verify no performance issues

#### Phase 1: Foundation (Week 1) - UPDATED
Same core classes, but UI is React components instead of vanilla JS

1. Build core classes (same as before)
2. Build `<OscillatorPanel>` component
3. Build reusable slider/button components
4. Wire up with ParameterManager
5. Test: Can control one oscillator via React UI

**Key Benefit**: Each component is ~50-100 lines instead of 200-300

#### Phases 2-6: Same Goals, React UI
All the same phases, but UI modules are now React components

### Code Example: Before vs After

#### V1 Style (Vanilla - Current Problem):
```typescript
// 50 lines just for ONE slider
function setupVolumeControl(oscNum: number) {
  const slider = document.getElementById(`osc${oscNum}-volume`) as HTMLInputElement;
  const valueDisplay = document.getElementById(`osc${oscNum}-volume-value`) as HTMLSpanElement;
  
  slider.addEventListener('input', () => {
    const config = voiceState.oscillatorConfigs.get(oscNum)!;
    const newVolume = parseInt(slider.value) / 100;
    config.volume = newVolume;
    valueDisplay.textContent = `${slider.value}%`;
    
    // Update all active voices
    voiceState.activeVoices.forEach((voice) => {
      voice.oscillators.forEach((oscData) => {
        if (oscData.oscNum === oscNum) {
          oscData.oscillator.setParameter('volume', newVolume);
        }
      });
    });
  });
  
  // Set initial value
  slider.value = String(voiceState.oscillatorConfigs.get(oscNum)!.volume * 100);
  valueDisplay.textContent = `${slider.value}%`;
}

// Need to call this 3 times for 3 oscillators
setupVolumeControl(1);
setupVolumeControl(2);
setupVolumeControl(3);
```

#### V2 Style (React - Clean!):
```tsx
// Single reusable component - 20 lines
interface VolumeSliderProps {
  oscNum: number;
  initialValue?: number;
}

function VolumeSlider({ oscNum, initialValue = 50 }: VolumeSliderProps) {
  const { paramManager } = useSynthEngine();
  const [volume, setVolume] = useState(initialValue);
  
  const handleChange = (value: number) => {
    setVolume(value);
    paramManager.updateOscillatorParameter(oscNum, 'volume', value / 100);
  };
  
  return (
    <div className="volume-control">
      <label>Volume</label>
      <input 
        type="range" 
        min="0" 
        max="100" 
        value={volume}
        onChange={(e) => handleChange(Number(e.target.value))}
      />
      <span>{volume}%</span>
    </div>
  );
}

// Usage - automatic for all 3 oscillators
<VolumeSlider oscNum={1} />
<VolumeSlider oscNum={2} />
<VolumeSlider oscNum={3} />
```

### Performance Considerations

**Concern**: Will React slow down audio?

**Answer**: No! React only manages UI, not audio processing.

```tsx
// Audio processing happens in Web Audio API (separate thread)
// React just updates sliders and buttons (UI thread)
// No interaction between them during audio processing

const handleVolumeChange = (value: number) => {
  // This is fast (just updates a gain node parameter)
  paramManager.updateOscillatorParameter(oscNum, 'volume', value);
  // Audio continues playing smoothly
};
```

**Best Practice**: 
- Don't update React state on every audio callback
- Use refs for audio nodes (no re-renders)
- Debounce slider updates if needed

### Bundle Size Impact

**V1 (Vanilla)**: ~150KB (just Web Audio code)
**V2 (React)**: ~195KB (~45KB for React, gzipped)

**Worth it?** YES!
- Massive code quality improvement
- Easier to maintain
- Faster development
- Better testing
- More professional

## Updated Decision: React + TypeScript

### Final Architecture

```
Audio Layer (No Framework)
├── Web Audio API
├── Oscillators, Filters, Effects
├── VoiceManager
└── ParameterManager

UI Layer (React)
├── Components (50-100 lines each)
├── Hooks (custom audio hooks)
├── Context (shared synth state)
└── Event handlers (declarative, clean)
```

**Separation of concerns**: Audio logic stays framework-free, UI uses React

## Next Steps

### Immediate (Before Starting)
1. ✅ Review this plan
2. ✅ Decide on React (recommended)
3. Get feedback on structure
4. Install React dependencies
5. Create React setup (Phase 0)
6. Create `/src/synth-v2/` directory
7. Set up new entry point (`synth-v2.html`)
8. Create project board (track phases/tasks)

### Week 1 Kickoff (Updated for React)
1. Set up React + TypeScript
2. Create SynthContext
3. Build core classes (SynthEngine, VoiceManager, ParameterManager)
4. Build first React component (VolumeSlider)
5. Test React + Web Audio integration
6. Get one oscillator playing via React UI

**Ready to start when you are!** 🚀

## Day 1 Checklist (Tomorrow)

### Morning Setup (1-2 hours)
- [ ] Install React dependencies
  ```bash
  npm install react react-dom
  npm install -D @types/react @types/react-dom @types/react-test-renderer
  npm install -D @testing-library/react @testing-library/jest-dom
  npm install -D @vitejs/plugin-react
  ```

- [ ] Update `vite.config.ts` for React
  ```typescript
  import react from '@vitejs/plugin-react';
  export default defineConfig({
    plugins: [react()],
    // ... rest of config
  });
  ```

- [ ] Create directory structure
  ```
  /src/synth-v2/
    /core/
    /components/
    /hooks/
    /context/
    App.tsx
    index.tsx
  ```

- [ ] Create `synth-v2.html` entry point
- [ ] Create basic React setup (App.tsx, index.tsx)

### Afternoon Coding (3-4 hours)
- [ ] Build SynthEngine class (stub)
- [ ] Build VoiceManager class (stub)
- [ ] Build ParameterManager class (stub)
- [ ] Create SynthContext (provide engine instances)
- [ ] Build first component: `<VolumeSlider>`
- [ ] Test: Can change volume via React component

### Success Criteria for Day 1
- ✅ React renders in browser
- ✅ Can access SynthEngine from React component
- ✅ One slider controls one parameter
- ✅ No TypeScript errors
- ✅ Dev server runs with hot reload

### Files to Create Tomorrow
1. `synth-v2.html` - HTML entry point
2. `src/synth-v2/index.tsx` - React mount point
3. `src/synth-v2/App.tsx` - Main app component
4. `src/synth-v2/context/SynthContext.tsx` - Audio context provider
5. `src/synth-v2/core/SynthEngine.ts` - Audio engine (stub)
6. `src/synth-v2/core/VoiceManager.ts` - Voice manager (stub)
7. `src/synth-v2/core/ParameterManager.ts` - Parameter manager (stub)
8. `src/synth-v2/components/common/Slider.tsx` - First component
9. `vite.config.ts` - Update for React support

**Estimated Time**: 4-6 hours for complete Phase 0 setup

**Ready to build tomorrow!** 🚀💪
