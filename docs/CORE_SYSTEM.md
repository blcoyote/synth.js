# Core Audio System

## Overview

The core audio system consists of three main components:

### 1. AudioEngine (`src/core/AudioEngine.ts`)
- **Singleton pattern** for centralized audio context management
- Manages Web Audio API context lifecycle
- Provides factory methods for creating audio nodes
- Handles context state (running/suspended/closed)

**Key Methods:**
- `initialize(config)` - Initialize audio context (must be called from user interaction)
- `getContext()` - Get the audio context
- `getDestination()` - Get speakers/output node
- `createGain()`, `createOscillator()`, etc. - Factory methods

### 2. AudioBus (`src/bus/AudioBus.ts`)
- **Dynamic signal routing** with effect chain management
- Add/remove/reorder effects on the fly
- Input and output gain control
- Effect bypass capability

**Key Methods:**
- `addEffect(effect, position?)` - Add effect to chain
- `removeEffect(effectId)` - Remove effect
- `moveEffect(effectId, newPosition)` - Reorder effects
- `bypassEffect(effectId, bypass)` - Toggle effect bypass
- `setInputGain()` / `setOutputGain()` - Volume control

### 3. BusManager (`src/bus/BusManager.ts`)
- **Centralized bus management**
- Creates and manages multiple buses
- Automatic master bus connection
- Bus routing and organization

**Key Methods:**
- `initialize()` - Create master bus
- `createBus(config)` - Create new bus
- `getBus(name)` - Get bus by name
- `getMasterBus()` - Get master output bus
- `setMasterVolume()` - Control master volume

## Architecture

```
[Audio Source]
      ↓
[AudioBus Input]
      ↓
[Effect 1] → [Effect 2] → [Effect 3]  ← Dynamic chain
      ↓
[AudioBus Output]
      ↓
[Master Bus]
      ↓
[Speakers]
```

## Usage Example

```typescript
import { AudioEngine } from './core';
import { BusManager } from './bus';

// Initialize system
const engine = AudioEngine.getInstance();
await engine.initialize();

const busManager = BusManager.getInstance();
busManager.initialize();

// Create a bus for effects
const fxBus = busManager.createBus({
  name: 'Effects',
  type: 'aux',
  gain: 0.7
});

// Add effects dynamically (we'll create these next!)
// fxBus.addEffect(delayEffect);
// fxBus.addEffect(reverbEffect);

// Play sound through the bus
const osc = engine.createOscillator('sine', 440);
osc.connect(fxBus.getInputNode());
osc.start();
```

## Type System

All components follow the `AudioComponent` interface:
- Consistent API across all modules
- Type-safe parameter control
- Enable/disable functionality
- Metadata access

## Next Steps

Now that the core is built, we can:
1. DONE: Core audio engine
2. DONE: Bus system with dynamic routing
3. NEXT: Build oscillator components
4. NEXT: Create effects (delay, reverb, distortion)
5. NEXT: Add envelope generators
6. NEXT: Build filters
