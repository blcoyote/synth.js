# React Component Test Suite

## Overview
Comprehensive test coverage for Synth V2 React components using Vitest and React Testing Library.

## Test Statistics
- **Total Tests**: 105 tests across 4 components
- **Pass Rate**: 100% (105/105 passing)
- **Duration**: ~2.26s
- **Framework**: Vitest 4.0.7 + React Testing Library 16.3.0

## Test Files

### 1. ErrorBoundary.test.tsx
**13 tests | 100% passing**

#### Coverage Areas:
- Error catching and display
- Error message rendering
- Reload button functionality
- Normal operation (no errors)
- Component state management
- Lifecycle methods (getDerivedStateFromError, componentDidCatch)

#### Key Tests:
- ✅ Catches errors thrown by child components
- ✅ Displays error message and UI when error occurs
- ✅ Shows "Something went wrong" heading
- ✅ Calls componentDidCatch on error
- ✅ Renders children normally when no error
- ✅ Resets error state on reload button click

---

### 2. Slider.test.tsx
**23 tests | 100% passing**

#### Coverage Areas:
- Component rendering (label, slider, value display)
- Configuration (min, max, step, unit)
- User interaction (onChange callback)
- Value formatting (custom formatValue function)
- Edge cases (negative values, decimals, no unit)

#### Key Tests:
- ✅ Renders label and slider input
- ✅ Displays initial value correctly
- ✅ Calls onChange callback with correct value
- ✅ Handles min/max/step attributes
- ✅ Supports custom formatValue functions
- ✅ Handles negative and decimal values
- ✅ Shows unit suffix when provided

---

### 3. SimpleKeyboard.test.tsx
**27 tests | 100% passing**

#### Coverage Areas:
- Keyboard rendering (24 keys, 2 octaves)
- Note calculation (correct MIDI note indices)
- Mouse interaction (playNote, releaseNote)
- Multiple simultaneous keys
- Key styling (white/black keys)
- Context integration (SynthEngine)

#### Key Tests:
- ✅ Renders 24 keys (2 octaves)
- ✅ Calculates note indices correctly (C4 = index 0)
- ✅ Calls playNote on mouseDown
- ✅ Calls releaseNote on mouseUp and mouseLeave
- ✅ Supports multiple keys pressed simultaneously
- ✅ Distinguishes between white and black keys
- ✅ Throws error when used outside SynthProvider

---

### 4. OscillatorPanel.test.tsx
**42 tests | 100% passing**

#### Coverage Areas:
- Rendering (headers, buttons, controls)
- Enable/Disable toggle functionality
- Waveform selection (sine, sawtooth, square, triangle)
- Parameter controls (volume, pan, octave, detune)
- Multiple oscillator instances (1, 2, 3)
- CSS classes (disabled, active)
- Context integration (parameterManager)
- Edge cases (undefined config, rapid changes)

#### Key Tests:
- ✅ Renders oscillator header with correct number
- ✅ Shows ON/OFF button based on state
- ✅ Shows/hides controls based on enabled state
- ✅ Toggles oscillator on button click
- ✅ Renders all 4 waveform options
- ✅ Highlights active waveform
- ✅ Changes waveform on button click
- ✅ Volume slider calls updateOscillatorParameter with correct values
- ✅ Pan slider handles -100 to 100 range
- ✅ Octave slider handles -2 to 2 range
- ✅ Detune slider handles -100 to 100 cents
- ✅ Independently controls oscillators 1, 2, and 3
- ✅ Applies disabled CSS class when off
- ✅ Applies active CSS class to toggle button
- ✅ Handles rapid parameter changes
- ✅ Handles all controls being changed in sequence

---

## Test Infrastructure

### Mock Setup
```typescript
// Mock state modules (voiceState, audioState, etc.)
vi.mock('../../../../src/state', () => ({
  voiceState: { oscillatorConfigs: new Map(...) },
  audioState: {},
  modulationState: {},
  visualizationState: {},
}));

// Mock engine with parameterManager
const mockEngine = {
  getParameterManager: vi.fn(() => mockParameterManager),
  parameterManager: mockParameterManager,
};
```

### Test Pattern
```typescript
// Wrap components in SynthProvider with mock engine
render(
  <SynthProvider engine={mockEngine as any}>
    <Component />
  </SynthProvider>
);
```

### Assertions
- **DOM Testing**: `toBeInTheDocument()`, `toHaveAttribute()`, `toHaveClass()`
- **Mock Verification**: `toHaveBeenCalled()`, `toHaveBeenCalledWith()`
- **User Interaction**: `fireEvent.click()`, `fireEvent.change()`, `fireEvent.mouseDown()`

---

## Key Learnings

### 1. State Initialization Timing
When testing components that depend on state, ensure state is initialized **before** rendering:
```typescript
// ✅ CORRECT: Enable before render
mockOscillatorConfigs.get(3)!.enabled = true;
renderPanel(3);

// ❌ WRONG: Enable after render (component won't have correct references)
renderPanel(3);
mockOscillatorConfigs.get(3)!.enabled = true;
```

### 2. Mock Cleanup
Use `vi.clearAllMocks()` in `beforeEach` to reset mock call counts between tests:
```typescript
beforeEach(() => {
  mockEngine = createMockEngine();
  vi.clearAllMocks();
});
```

### 3. Context Provider Pattern
Always wrap components that use context in the provider:
```typescript
// Components using useSynthEngine() must be wrapped
render(
  <SynthProvider engine={mockEngine}>
    <OscillatorPanel oscNum={1} />
  </SynthProvider>
);
```

### 4. Testing Error Boundaries
Error boundaries require special handling for error lifecycle methods:
```typescript
// Test getDerivedStateFromError
const result = ErrorBoundary.getDerivedStateFromError(new Error('Test'));
expect(result).toEqual({ hasError: true, error: expect.any(Error) });

// Test componentDidCatch
const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
// ... trigger error ...
expect(spy).toHaveBeenCalled();
```

---

## Running Tests

### All React Component Tests
```bash
npm test -- tests/unit/synth-v2/components/
```

### Individual Component
```bash
npm test -- tests/unit/synth-v2/components/ErrorBoundary.test.tsx
npm test -- tests/unit/synth-v2/components/Slider.test.tsx
npm test -- tests/unit/synth-v2/components/SimpleKeyboard.test.tsx
npm test -- tests/unit/synth-v2/components/OscillatorPanel.test.tsx
```

### Watch Mode
```bash
npm test -- tests/unit/synth-v2/components/ --watch
```

---

## Future Enhancements

### Additional Components to Test
- [ ] OscillatorConfig component (FM/AM controls)
- [ ] EffectsPanel component
- [ ] FilterPanel component
- [ ] EnvelopePanel component
- [ ] ModulationPanel component

### Integration Tests
- [ ] Full synthesizer workflow (keyboard → oscillators → effects → output)
- [ ] Parameter automation with LFO
- [ ] MIDI input handling
- [ ] Preset loading/saving

### Visual Regression Tests
- [ ] Snapshot testing for UI components
- [ ] Visual diffs for waveform displays
- [ ] Knob/slider appearance tests

---

## Test Coverage Summary

| Component | Tests | Status | Coverage |
|-----------|-------|--------|----------|
| ErrorBoundary | 13 | ✅ 100% | Error handling, lifecycle |
| Slider | 23 | ✅ 100% | Rendering, interaction, formatting |
| SimpleKeyboard | 27 | ✅ 100% | Rendering, notes, mouse events |
| OscillatorPanel | 42 | ✅ 100% | All controls, multiple instances |
| **TOTAL** | **105** | **✅ 100%** | **Comprehensive coverage** |

---

## Maintenance Notes

### When Adding New Props
1. Add tests for new prop behavior
2. Test default values if prop is optional
3. Test edge cases (undefined, null, extreme values)

### When Modifying Component Logic
1. Run tests first to ensure existing behavior is documented
2. Add tests for new behavior before implementation (TDD)
3. Update tests if behavior intentionally changes

### When Refactoring
1. Tests should continue passing without modification
2. If tests need changes, verify behavior hasn't changed
3. Use tests as regression prevention

---

*Last Updated: [Current Date]*
*Test Framework: Vitest 4.0.7*
*React Testing Library: 16.3.0*
