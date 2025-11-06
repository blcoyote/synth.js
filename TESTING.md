# Testing Setup Guide

## Quick Start

### 1. Install Dependencies

**Using cmd.exe (recommended for this project):**
```cmd
npm install
```

This will install:
- `jsdom` - Browser environment for testing
- `@vitest/ui` - Visual test runner interface
- `@vitest/coverage-v8` - Code coverage reporting

### 2. Run Tests

**Run all tests:**
```cmd
npm test
```

**Run tests in watch mode:**
```cmd
npm test -- --watch
```

**Run tests with UI:**
```cmd
npm run test:ui
```

**Run with coverage:**
```cmd
npm test -- --coverage
```

## What's Included

### Test Files Created:
1. **`vitest.config.ts`** - Test configuration
2. **`tests/setup.ts`** - Web Audio API mocks
3. **`tests/unit/core/AudioEngine.test.ts`** - AudioEngine tests
4. **`tests/unit/bus/AudioBus.test.ts`** - AudioBus tests (needs adjustment)
5. **`tests/unit/components/Oscillators.test.ts`** - Oscillator tests (needs adjustment)
6. **`tests/integration/VoiceManagement.test.ts`** - Integration tests (needs adjustment)

### Test Structure:
```
tests/
├── setup.ts                    # Mock Web Audio API
├── README.md                   # Testing documentation
├── unit/                       # Component unit tests
│   ├── core/
│   ├── components/
│   └── bus/
└── integration/                # System integration tests
```

## Current Status

### Completed:
- Test framework configured (Vitest)
- Web Audio API mocks created
- Test structure established
- Basic AudioEngine tests written
- Test documentation created

### Needs Adjustment:
Some test files have TypeScript errors because they were written based on assumed interfaces. They need to be updated to match your actual implementations:

1. **AudioBus tests** - Need to match actual AudioBus API
2. **Oscillator tests** - Need to use BaseOscillator methods
3. **Integration tests** - Need to use actual ADSREnvelope API

### Next Steps:

1. **Install dependencies** (in cmd terminal):
   ```cmd
   npm install
   ```

2. **Fix AudioEngine test** to match actual implementation

3. **Update test files** to match your actual component APIs

4. **Run tests** to verify they pass:
   ```cmd
   npm test
   ```

## Benefits of This Testing System

### Prevents Issues Like:
- The knob initialization bug we just fixed
- Breaking changes when refactoring
- Regression bugs
- API inconsistencies

### Provides:
- **Confidence** - Know your code works
- **Coverage Reports** - See what's tested
- **Fast Feedback** - Tests run in milliseconds
- **Documentation** - Tests show how components work
- **Bug Prevention** - Catch issues before users do

## Example: Running Your First Test

1. Open cmd terminal
2. Navigate to project: `cd "c:\Users\blc\Desktop\Ny mappe"`
3. Install: `npm install`
4. Run tests: `npm test`
5. See results!

## Test-Driven Development Workflow

Going forward, when adding new features:

1. **Write test first** - Define expected behavior
2. **Run test** - It should fail (red)
3. **Write code** - Implement the feature
4. **Run test** - It should pass (green)
5. **Refactor** - Clean up code
6. **Run test again** - Still passes!

This prevents bugs like the knob issue and ensures every component works as expected.

## Need Help?

Check `tests/README.md` for:
- Detailed test documentation
- Test writing guide
- Best practices
- Coverage goals
