# Audio Bus Agent - Common Usage Examples

Reference these examples to see how to get the best results from the audio-bus-chain agent.

## Example 1: Adding a New Effect

### Poor Prompt ❌
```
@audio-bus-chain I want to add reverb
```
**Problem:** Not enough context. Agent can't optimize for your situation.

### Good Prompt ✅
```
@audio-bus-chain I need to add reverb to my effects chain.
Currently have: compressor → distortion → lowpass filter
Voice setup: 16 polyphonic voices
Issue: Only want reverb on 30% wet, rest dry
Help me place it and handle gain staging.
```
**Result:** Agent provides:
- Optimal reverb placement in chain
- Gain scaling for 16 voices
- Wet/dry mix calculation
- Working code with proper connection logic

---

## Example 2: Troubleshooting Silent Output

### Poor Prompt ❌
```
I can't hear anything from my synth
```
**Problem:** No context; default agent won't know to use audio-bus-chain.

### Good Prompt ✅
```
@audio-bus-chain My synthesizer is silent. I'm playing notes, but no sound from speakers.
I have:
- 8 active voices
- Effects chain: compressor → delay → reverb
- Master gain set to -6dB
What's wrong with my signal routing?
```
**Result:** Agent uses TROUBLESHOOTING.md to:
1. Diagnose the issue
2. Provide diagnostic code
3. Show exact fix with context parameters

---

## Example 3: Gain Staging Issues

### Poor Prompt ❌
```
My sound is too loud and distorted
```
**Problem:** Unclear what's happening. Might be voice scaling, effect output, or master level.

### Good Prompt ✅
```
@audio-bus-chain I'm getting clipping at my master output when 4+ voices play simultaneously.
Setup:
- Polyphonic voices: 8 total
- Current per-voice gain: 1.0 (full volume)
- Effects: compression (threshold -20) → saturation → reverb
- Master gain: -6dB
The issue: Each voice is too loud, summing causes peaks. Calculate optimal gain staging.
```
**Result:** Agent:
1. Calculates correct per-voice gain (1/8 = 0.125 = -18dB)
2. Adjusts effect gains to compensate
3. Uses TROUBLESHOOTING.md #2 (Clipping)
4. Provides working code with measurements

---

## Example 4: Choosing a Sound Configuration

### Poor Prompt ❌
```
@audio-bus-chain What effects should I use?
```
**Problem:** Too open-ended. Which sound are you going for?

### Good Prompt ✅
```
@audio-bus-chain I want to create a warm, vintage-sounding pad.
Current voices: 4 polyphonic layers
Target tone: Analog warmth with slight saturation
Suggest an effect chain from BUS-CONFIGS.md that works, then walk me through gain staging.
```
**Result:** Agent:
1. References BUS-CONFIGS.md #2 (Warmth/Analog)
2. Explains why each effect is there
3. Provides customized code for your 4-voice setup
4. Shows gain calculations

---

## Example 5: Debugging Parameter Automation (Clicking)

### Poor Prompt ❌
```
I'm getting pops when I change filter cutoff
```
**Problem:** Generic issue, many possible causes.

### Good Prompt ✅
```
@audio-bus-chain I'm getting clicking/popping when I sweep filter cutoff.
Code I'm using:
  filter.frequency.value = newCutoff; // Direct assignment
I'm changing cutoff 60 times per second from a slider.
How do I smooth this out?
Ref: TROUBLESHOOTING.md #3
```
**Result:** Agent:
1. Shows the problem (direct assignment instead of ramping)
2. Shows correct solution (use setTargetAtTime)
3. Provides smooth automation code
4. Explains Audio API scheduling best practices

---

## Example 6: Complex Signal Routing

### Poor Prompt ❌
```
How should I connect everything?
```
**Problem:** Vague. What's the current architecture?

### Good Prompt ✅
```
@audio-bus-chain I'm redesigning my signal flow.
Current structure:
- 16 voices (each has: osc → filter → envelope)
- All voices → master bus
- Master bus → effects chain → speakers

I want:
- Dry/wet split (30% through effects, 70% dry to speakers)
- Effects: compression → saturation → delay → reverb
- Master limiting to prevent clipping

Draw the signal flow and show how to implement it.
```
**Result:** Agent:
1. Creates ASCII diagram of signal flow
2. Shows how to implement dry/wet split (parallel routing)
3. Warns about common pitfalls
4. Provides complete connection code

---

## Example 7: Performance Optimization

### Poor Prompt ❌
```
My synth is too slow
```
**Problem:** Many causes. Need specific metrics.

### Good Prompt ✅
```
@audio-bus-chain Performance issue: CPU spikes when more than 8 voices play.
Current setup:
- Effects chain: 5 effects (2 reverbs using convolution)
- Polyphony: 32 max voices
- Each voice: 3 oscillators + complex envelope

Chrome DevTools shows scripting time is 40ms per frame.
What's the bottleneck and how do I optimize?
Ref: TROUBLESHOOTING.md #7 (Polyphony)
```
**Result:** Agent:
1. Identifies convolver reverbs as likely culprit
2. Suggests lighter reverb algorithm
3. Shows how to limit active voices (voice stealing)
4. Provides optimization code with profiling guidance

---

## Automatic Delegation Examples

**These prompts will automatically trigger the audio-bus-chain agent without `@`:**

```
"I'm adding effects to the chain but the output sounds thin"
→ Keywords: "effects," "output," "chain" → auto-delegates
```

```
"How do I prevent clipping when all 32 voices play?"
→ Keywords: "preventing clipping," "gains," "voices" → auto-delegates
```

```
"The master bus is distorting - how do I add a limiter?"
→ Keywords: "master bus," "distorting," "limiter" → auto-delegates
```

```
"I'm reordering effects - reverb should be last"
→ Keywords: "reordering effects," "signal flow" → auto-delegates
```

**These will NOT auto-delegate (use default agent + synthesis skill):**

```
"What's a good sawtooth oscillator frequency for a lead?"
→ Oscillator topic, not routing → default agent
```

```
"Explain FM synthesis frequency ratios"
→ DSP theory, not audio routing → default agent
```

```
"How do I design a filter envelope?"
→ Envelope design, not signal flow → default agent
```

---

## Prompt Structure Template

**Use this template for best results:**

```
@audio-bus-chain [Optional: Reference TROUBLESHOOTING.md #X or BUS-CONFIGS.md #X]

My situation:
- [What are you trying to accomplish?]
- [Current implementation/code]
- [What's happening vs. what should happen]

Context:
- Polyphonic voices: [number]
- Effects currently in chain: [list]
- Target gain levels: [specify]

Help with:
- [Specific aspect you need help with]
- [Any code examples or error messages]
```

**Example:**

```
@audio-bus-chain Ref: TROUBLESHOOTING.md #2

My situation:
- Adding a saturation effect to my effects chain
- 8 polyphonic voices causing summing clipping
- Need proper gain staging

Context:
- Polyphonic voices: 8
- Current effects: highpass → compressor → saturation → reverb
- Per-voice gain currently: 1.0 (too loud)

Help with:
- Calculate optimal per-voice gain
- Show where saturation should go in the chain
- Implement smooth bypass for saturation effect
```

---

## Signs You're Getting Good Agent Involvement

✅ **Working well:**
- Agent references specific files (TROUBLESHOOTING.md, BUS-CONFIGS.md)
- Agent asks follow-up questions about your signal flow
- Agent provides both explanation AND working code
- Agent mentions gain staging calculations
- Agent warns about common pitfalls

❌ **Not working well:**
- Generic responses that could apply to any synth
- No reference to your specific setup (voice count, effect list)
- Suggestions that don't match your context
- No code examples

---

## Quick Command Reference

| Task | Command Pattern |
|------|-----------------|
| Add effect | `@audio-bus-chain Add [effect] after [current effect]` |
| Fix clipping | `@audio-bus-chain Ref: TROUBLESHOOTING.md #2 - My setup...` |
| Design chain | `@audio-bus-chain Use BUS-CONFIGS.md #[1-7] for...` |
| Troubleshoot sound issue | `@audio-bus-chain Ref: TROUBLESHOOTING.md - Currently hearing...` |
| Understand signal flow | `@audio-bus-chain Show me the complete signal path from voices to speakers` |
| Optimize performance | `@audio-bus-chain I have [N] voices and CPU is high. Optimize effects.` |

---

## When to Use Default Agent Instead

If your question is about **component design** (not routing):

```
Use default agent:
- "Design an oscillator with these characteristics"
- "What filter type should I use for [tone]?"
- "How do LFOs modulate parameters?"
- "Explain FM synthesis"

Use @audio-bus-chain:
- "Where should the filter go in the signal chain?"
- "How do I route LFO to multiple targets?"
- "My filter sweep is clicking - fix the automation"
```

The key: **Routing/flow = @audio-bus-chain | Design/theory = default agent**
