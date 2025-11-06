# Modular Synthesizer Test Suite

## Overview
Comprehensive unit and integration tests for the modular synthesizer project.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup (Web Audio API mocks)
├── unit/                       # Unit tests for individual components
│   ├── core/                   # Core system tests
│   │   └── AudioEngine.test.ts
│   ├── components/             # Component tests
│   │   ├── Oscillators.test.ts
│   │   └── Envelopes.test.ts (TODO)
│   └── bus/                    # Bus system tests
│       └── AudioBus.test.ts
└── integration/                # Integration tests
    └── VoiceManagement.test.ts
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test AudioEngine
```

## Test Categories

### Unit Tests
Test individual components in isolation:
- **Core**: AudioEngine singleton, context management
- **Components**: Oscillators, filters, effects, envelopes
- **Bus System**: Audio routing, effect chains

### Integration Tests
Test component interactions:
- **Voice Management**: Polyphonic voice handling
- **Signal Flow**: Complete audio routing chains
- **Effect Chains**: Dynamic effect insertion/removal

## Writing Tests

### Test Template
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AudioEngine } from '../../src/core/AudioEngine';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  describe('Feature Group', () => {
    it('should do something specific', () => {
      // Arrange
      const component = new Component();
      
      // Act
      const result = component.method();
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Testing Best Practices

1. **Use descriptive test names**
   - GOOD: `it('should start oscillator and play audio')`
   - BAD: `it('works')`

2. **Follow AAA pattern**
   - Arrange: Set up test data
   - Act: Execute the code under test
   - Assert: Verify the results

3. **Test one thing at a time**
   - Each test should verify a single behavior

4. **Use beforeEach for setup**
   - Keep tests independent and isolated

5. **Clean up after tests**
   - Disconnect audio nodes
   - Stop oscillators
   - Reset singletons

## Web Audio API Mocking

The test environment provides mocked Web Audio API classes:
- `AudioContext`
- `OscillatorNode`
- `GainNode`
- `StereoPannerNode`
- `BiquadFilterNode`
- And more...

These mocks allow testing audio logic without requiring a real audio context.

## Coverage Goals

- **Unit Tests**: > 80% coverage for all modules
- **Integration Tests**: Cover all critical user paths
- **Edge Cases**: Test boundary conditions and error handling

## TODO: Tests to Add

### Unit Tests
- [ ] Filters (LowpassFilter, HighpassFilter, etc.)
- [ ] Effects (Delay, Reverb, Distortion)
- [ ] LFO modulation
- [ ] BusManager
- [ ] Parameter automation

### Integration Tests
- [ ] Complete synthesizer workflow
- [ ] Effect chain routing
- [ ] MIDI input handling
- [ ] Preset loading/saving
- [ ] Performance benchmarks

### Edge Case Tests
- [ ] Audio context state handling (suspended/running/closed)
- [ ] Memory leak detection
- [ ] Rapid parameter changes
- [ ] Voice stealing algorithms
- [ ] Sample rate changes

## Debugging Tests

### View test output
```bash
npm test -- --reporter=verbose
```

### Debug specific test
```bash
npm test -- --inspect-brk AudioEngine.test.ts
```

### Check for only/skip
```bash
# Fails if .only or .skip are found
npm test -- --no-only
```

## Continuous Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Pull requests
- Main branch merges

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Web Audio API Specification](https://www.w3.org/TR/webaudio/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
