# Audio Bus Troubleshooting Guide

Common issues and solutions for signal routing, effects chain, and gain staging.

## No Sound / Silent Output

### Diagnosis
1. Check if audio context is suspended
2. Verify complete signal path
3. Confirm gains are non-zero
4. Test with direct oscillator (bypass effects)

### Solutions

**Check AudioContext State**
```typescript
const context = AudioEngine.getInstance().getContext();
console.log('Context state:', context.state); // 'running', 'suspended', 'closed'

if (context.state === 'suspended') {
  context.resume();
}
```

**Verify Signal Path is Connected**
```typescript
// Trace connections:
oscillator → gainNode → filter → effects chain → masterGain → destination

// Use analyzer to check for signal
const analyzer = context.createAnalyser();
effects.getOutputNode().connect(analyzer);
const dataArray = new Uint8Array(analyzer.fftSize);
analyzer.getByteTimeDomainData(dataArray);

const hasSignal = dataArray.some(v => v > 128 || v < 128); // Non-128 = signal
```

**Check All Gains**
```typescript
// Verify no zero gains in the path
console.log({
  voiceGain: voice.gainNode.gain.value,
  effectsInput: effectsManager.inputNode.gain.value,
  effectsOutput: effectsManager.outputNode.gain.value,
  masterGain: masterGain.gain.value,
  contextDestination: context.destination // Should be destination
});

// All should be > 0.001
```

**Test Direct Path (Bypass Effects)**
```typescript
// Remove all effects, connect voice directly to master
voice.gainNode.disconnect();
voice.gainNode.connect(masterGain);

// If sound appears, effects chain is the issue
```

---

## Clipping / Distortion at High Volumes

### Diagnosis
1. Check master output level (should be < 1.0, ideally < 0.707)
2. Verify per-voice gain calculation
3. Check effect output levels
4. Look for accumulation points without gain control

### Solutions

**Correct Per-Voice Gain**
```typescript
// ❌ Bad: All voices at full volume
voice.gainNode.gain.value = 1.0; // Clips with multiple voices

// ✅ Good: Scale by voice count
const voiceCount = activeVoices.size;
const perVoiceGain = 1.0 / voiceCount;
voice.gainNode.gain.value = perVoiceGain;

// Rule of thumb:
// 1 voice:  1.0 (-0 dB)
// 2 voices: 0.5 (-6 dB each)
// 4 voices: 0.25 (-12 dB each)
// 8 voices: 0.125 (-18 dB each)
```

**Set Master Headroom**
```typescript
// Maintain -6dB headroom at master output
const masterGain = context.createGain();
masterGain.gain.value = dbToGain(-6); // 0.501

// Formula: dbToGain(dB) = Math.pow(10, dB / 20)
```

**Add Limiter to Master Bus**
```typescript
const limiter = context.createDynamicsCompressor();
limiter.threshold.value = -6; // Start limiting at -6dB
limiter.ratio.value = 20; // Hard limiting
limiter.attack.value = 0.001; // Fast response
limiter.release.value = 0.1; // Quick release
limiter.knee.value = 0; // No soft knee (hard wall)

voiceOutput → limiter → masterGain → destination
```

**Check Effect Chain for Gain Accumulation**
```typescript
// Some effects boost level (distortion, reverb)
// Compensate with wet/dry mix or post-effect gain

// Example: Reverb can boost by 3-6dB
reverb.setMix(0.3); // Lower wet level
// OR
reverb.getOutputNode().gain.value = dbToGain(-3); // Post-effect gain reduction
```

**Measure Actual Output Level**
```typescript
function measureOutputLevel() {
  const analyzer = context.createAnalyser();
  masterGain.connect(analyzer);
  
  const dataArray = new Float32Array(analyzer.fftSize);
  analyzer.getFloatTimeDomainData(dataArray);
  
  // RMS level
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i] * dataArray[i];
  }
  const rms = Math.sqrt(sum / dataArray.length);
  const db = 20 * Math.log10(rms);
  
  console.log('RMS level:', db, 'dB'); // Should be < 0dB, ideally -6dB to -12dB
  return db;
}
```

---

## Clicking / Popping Sounds

### Diagnosis
1. Parameter changes are too fast
2. Gain values changing without ramping
3. Node disconnection/reconnection without fade-out
4. Schedule conflicts (cancelScheduledValues not called)

### Solutions

**Use Ramping, Not Direct Assignment**
```typescript
const now = context.currentTime;

// ❌ Bad: Creates click
filter.frequency.value = newFreq;

// ✅ Good: Ramp over time
filter.frequency.setTargetAtTime(newFreq, now, 0.01); // τ = 10ms

// ✅ Also good: Linear ramp for slower transitions
filter.frequency.linearRampToValueAtTime(newFreq, now + 0.05); // 50ms ramp
```

**Cancel Scheduled Values Before New Schedules**
```typescript
const now = context.currentTime;
param.cancelScheduledValues(now); // Clear any pending automation
param.setValueAtTime(param.value, now); // Anchor current value
param.exponentialRampToValueAtTime(newValue, now + 0.1); // Start new automation
```

**Fade Out Before Disconnecting**
```typescript
// ❌ Bad: Instant silence, click
effect.disconnect();

// ✅ Good: Fade before disconnect
effect.getOutputNode().gain.linearRampToValueAtTime(0.001, now + 0.05);
effect.disconnect();
```

**Check Effect Bypass Logic**
```typescript
// ❌ Bad bypass (abrupt gain change)
if (bypassed) {
  dryGain.gain.value = 1;
  wetGain.gain.value = 0;
}

// ✅ Good bypass (ramped)
if (bypassed) {
  const now = context.currentTime;
  dryGain.gain.setTargetAtTime(1, now, 0.01);
  wetGain.gain.setTargetAtTime(0, now, 0.01);
}
```

**Verify No Envelope Conflicts**
```typescript
// If note end (release) coincides with parameter change, schedule ahead
const noteEndTime = context.currentTime + releaseDuration;
const safeScheduleTime = noteEndTime + 0.01; // Schedule 10ms after note ends
param.linearRampToValueAtTime(newValue, safeScheduleTime);
```

---

## Effects Not Working / No Wet Signal

### Diagnosis
1. Effect not connected to effects chain input
2. Wet gain is 0
3. Effect bypass is enabled
4. Effect input not receiving signal

### Solutions

**Verify Effect is in Chain**
```typescript
// Check EffectsManager internal state
const effectSlots = effectsManager.getEffects(); // Access method if available
effectSlots.forEach(slot => {
  console.log(`Effect: ${slot.effect.name}, Bypassed: ${slot.bypassed}`);
});
```

**Check Wet/Dry Mix**
```typescript
// Wet signal might be at 0
const mix = effect.getMix();
console.log('Effect mix:', mix); // Should be > 0 to hear wet signal

// Set mix to 100% wet to test
effect.setMix(1.0); // Full wet
// If sound appears, mix was too dry
```

**Verify Effect Bypass is Off**
```typescript
if (effect.isBypassed()) {
  console.warn('Effect is bypassed');
  effect.bypass(false); // Disable bypass
}
```

**Test Effect in Isolation**
```typescript
// Direct connection test
input.disconnect();
input.connect(effect.getInputNode());
effect.getOutputNode().connect(destination);

// If sound appears, effect works fine
// If not, effect has internal connection issue
```

**Check Effect Output Node Connection**
```typescript
// Ensure effect output is connected to next stage
const outputNode = effect.getOutputNode();
console.log('Output connections:', outputNode.numberOfOutputs);
// Should be > 0 if connected to something
```

---

## Effects Chain Reordering Not Working

### Diagnosis
1. Effects not disconnecting properly
2. New connections not made
3. State not updated in UI/audioState
4. Bypass flags interfering

### Solutions

**Rebuild Chain Procedure**
```typescript
// Standard sequence:
1. Disconnect all effects
2. Clear effect array
3. Reconnect in new order
4. Call _rebuildChain() or equivalent
5. Update state modules

// Example:
effects.forEach(slot => slot.effect.disconnect());
effects = []; // Clear array
effectsManager.moveEffect(effectId, newIndex);
// Internally: reconnects in new order
```

**Verify Chain Rebuild**
```typescript
// After reordering, test signal path
const testNode = context.createOscillator();
testNode.frequency.value = 440;
testNode.connect(effectsManager.getInputNode());

effectsManager.getOutputNode().connect(context.destination);

testNode.start();
// Should hear A4 through reordered chain
testNode.stop();
```

**State Synchronization**
```typescript
// If UI doesn't reflect new order, update state
audioState.effectsOrder = reorderedEffectIds;
// Notify state listeners/React components
```

---

## Effect Bypass Not Smooth

### Diagnosis
1. Mix not ramping in bypass()
2. Bypass affecting both dry and wet
3. No fade time allocated
4. Parameter conflicts

### Solutions

**Implement Smooth Bypass**
```typescript
public bypass(shouldBypass: boolean): void {
  const now = this.engine.getCurrentTime();
  const fadeTime = 0.05; // 50ms fade
  
  if (shouldBypass) {
    // Fade to dry only
    this.dryGain.gain.setTargetAtTime(1, now, 0.01);
    this.wetGain.gain.setTargetAtTime(0, now, 0.01);
  } else {
    // Restore to mix level
    const dryLevel = 1 - this.mix;
    const wetLevel = this.mix;
    
    this.dryGain.gain.setTargetAtTime(dryLevel, now, 0.01);
    this.wetGain.gain.setTargetAtTime(wetLevel, now, 0.01);
  }
  
  this.bypassed = shouldBypass;
}
```

**Avoid Mix Changes During Bypass**
```typescript
// ❌ Don't do this
effect.bypass(true);
effect.setMix(0.7); // Changing mix while bypassing causes glitch

// ✅ Do this instead
effect.setMix(0.7); // Set mix first
effect.bypass(false); // Then enable effect
```

---

## Polyphony Causing Performance Issues

### Diagnosis
1. CPU usage high with multiple voices
2. Audio stuttering/dropouts at high voice count
3. Effects disabled to reduce load
4. Real-time parameter updates lagging

### Solutions

**Optimize Voice Count**
```typescript
// Limit maximum voices
const MAX_VOICES = 32; // Adjust based on target device
const voicesAvailable = context.baseLatency > 0.01 ? 16 : 32;

// Voice stealing (remove oldest)
if (activeVoices.size >= MAX_VOICES) {
  const oldest = Array.from(activeVoices.values()).sort(
    (a, b) => a.startTime - b.startTime
  )[0];
  stopVoice(oldest);
}
```

**Optimize Effects Usage**
```typescript
// Use lighter effects for polyphony
// ✅ Good: Simple filters, one reverb
// ❌ Bad: Multiple convolver reverbs per voice

// Share effects across voices (don't create per-voice)
const sharedReverb = new ReverbEffect(); // One instance
allVoices.forEach(voice => {
  voice.connect(sharedReverb); // All voices use same reverb
});
```

**Profile with DevTools**
```typescript
// Chrome: DevTools → Performance → Record
// Look for:
// - Scripting time (parameter updates)
// - Rendering time (not relevant for audio)
// - GC pauses (memory allocation in audio loop)

// Optimize by:
// - Pre-allocating arrays/objects
// - Avoiding new() in audio callback
// - Minimizing parameter changes at audio rate
```

**Use Web Audio Worklet (Advanced)**
```typescript
// For custom DSP on separate thread (only if needed)
const processor = await context.audioWorklet.addModule('processor.js');
const worklet = new AudioWorkletNode(context, 'my-processor');
// Reduces main thread load
```

---

## Master Output Too Quiet

### Diagnosis
1. Master gain set too low
2. Per-voice gain over-compensated
3. Headroom setting too conservative
4. Effect wet levels too low

### Solutions

**Check Master Gain Value**
```typescript
const masterGain = audioState.masterGain;
console.log('Master gain value:', masterGain.gain.value); // Should be 0.5-1.0

// Standard: -6dB = 0.501
const correctGain = dbToGain(-6); // 0.501
masterGain.gain.value = correctGain;
```

**Recalculate Per-Voice Levels**
```typescript
// If master is too quiet, check voice scaling
const voiceCount = 8;
const perVoiceDb = 20 * Math.log10(1 / voiceCount); // -18dB for 8 voices
const perVoiceGain = 1 / voiceCount;

// This is CORRECT for preventing clipping
// If overall is too quiet, increase master gain instead

masterGain.gain.value = dbToGain(-3); // Quieter master
// OR
masterGain.gain.value = dbToGain(0); // Normal master (less headroom)
```

**Check Effect Levels**
```typescript
// Some effects reduce output
const effect = effects[i];
const mix = effect.getMix();
const effectGain = effect.getOutputNode().gain.value;

console.log(`Effect: ${effect.name}, Mix: ${mix}, Output Gain: ${effectGain}`);

// If effect output gain < 1, boost it
effect.getOutputNode().gain.value = 1.0;
```

---

## Memory Leaks from Disconnected Nodes

### Diagnosis
1. Audio context state doesn't reflect cleanup
2. Effect removal doesn't free nodes
3. Voice cleanup leaves connections
4. Repeated add/remove effects over time

### Solutions

**Proper Node Cleanup**
```typescript
// ✅ Correct cleanup sequence
effect.disconnect(); // Disconnect from graph
effect.cleanup?.(); // Call effect's cleanup if it exists
effect = null; // Clear reference

// For effects with internal nodes:
effect.getOutputNode().disconnect();
effect.getInputNode().disconnect();
effect.getInternalNodes?.().forEach(node => node.disconnect());
```

**Remove Effect Pattern**
```typescript
removeEffect(effectId: string): void {
  const slot = this.effects.find(s => s.id === effectId);
  if (!slot) return;
  
  // Disconnect effect
  slot.effect.disconnect();
  
  // Clear internal references (if implementing)
  if (slot.effect.cleanup) {
    slot.effect.cleanup();
  }
  
  // Remove from array
  this.effects = this.effects.filter(s => s.id !== effectId);
  
  // Rebuild chain
  this._rebuildChain();
}
```

**Voice Cleanup on Stop**
```typescript
stopVoice(voiceId: string): void {
  const voice = activeVoices.get(voiceId);
  if (!voice) return;
  
  // Fade out
  const now = context.currentTime;
  voice.gainNode.linearRampToValueAtTime(0.001, now + 0.1);
  
  // Stop oscillators
  voice.oscillators.forEach(osc => osc.stop(now + 0.1));
  
  // Disconnect after fade
  setTimeout(() => {
    voice.gainNode.disconnect();
    voice.oscillators.forEach(osc => osc.disconnect());
    activeVoices.delete(voiceId);
  }, 100); // After fade completes
}
```

---

## Latency Issues / Delayed Response

### Diagnosis
1. Parameter changes feel sluggish
2. Scheduling too far ahead
3. Buffer size too large
4. Real-time constraints not met

### Solutions

**Reduce Scheduling Buffer**
```typescript
// ❌ Too far ahead
const scheduleTime = context.currentTime + 0.5; // 500ms delay
parameter.setTargetAtTime(value, scheduleTime, 0.01);

// ✅ Minimal buffer
const scheduleTime = context.currentTime + 0.01; // 10ms ahead
parameter.setTargetAtTime(value, scheduleTime, 0.01);
```

**Use Immediate Updates for UI Feedback**
```typescript
// For interactive controls, update both:
1. Immediate: Update UI display and internal state
2. Scheduled: Audio parameter changes with minimal delay

onFilterCutoffChange(value) {
  // Immediate (visual feedback)
  setUIDisplayValue(value);
  
  // Audio update (small delay)
  const now = context.currentTime;
  filter.frequency.setTargetAtTime(value, now + 0.005, 0.01);
}
```

**Monitor Actual Latency**
```typescript
const startTime = context.currentTime;
parameter.setValueAtTime(newValue, startTime + 0.01);

// Time when it actually applies
const actualLatency = (startTime + 0.01) - context.currentTime;
console.log('Actual latency:', actualLatency * 1000, 'ms'); // Should be ~10-50ms
```

---

## Summary Reference

| Issue | Common Cause | Quick Fix |
|-------|--------------|-----------|
| No sound | Silent context / path broken | Check context.resume(), verify connections |
| Clipping | Too loud sources | Reduce per-voice gain or add limiter |
| Clicking | Unramped parameters | Use setTargetAtTime/ramps |
| Wet signal missing | Wet gain=0 or bypassed | Check setMix() and bypass() states |
| Effects not reordering | Connections not rebuilt | Call _rebuildChain() after reorder |
| Smooth bypass broken | Direct gain assignment | Use setTargetAtTime in bypass() |
| Performance drop | Too many voices | Limit max voices, use shared effects |
| Output too quiet | Low master gain | Increase master level, verify per-voice scaling |
| Memory creeping up | Nodes not disconnected | Disconnect before removing effects |
| Parameter changes delayed | Over-scheduling ahead | Reduce buffer, schedule closer to now |
