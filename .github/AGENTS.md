# Synth.js Custom Agents Guide

This workspace includes specialized agents for different synthesis tasks.

## Available Agents

### `@audio-bus-chain` — Audio Bus & Effects Chain
**When to use:**
- ✅ Adding or removing effects from the chain
- ✅ Reordering effects (signal flow optimization)
- ✅ Troubleshooting clipping, distortion, or silence
- ✅ Gain staging and preventing feedback
- ✅ Designing master bus configurations
- ✅ Performance optimization (too many effects, CPU load)
- ✅ Understanding signal routing
- ✅ Implementing smooth parameter automation

**Example prompts:**
```
@audio-bus-chain My output is clipping at high volumes - help me fix gain staging
@audio-bus-chain I need to add reverb to the effects chain
@audio-bus-chain Design a bright, modern sound bus configuration
@audio-bus-chain Why is there clicking when I change filter cutoff?
```

**Resources:**
- [TROUBLESHOOTING.md](./agents/audio-bus-chain/TROUBLESHOOTING.md) — 10 common issues + solutions
- [BUS-CONFIGS.md](./agents/audio-bus-chain/BUS-CONFIGS.md) — 7 production-ready configurations

---

### Default Agent — Synthesis & General Questions
**When to use:**
- ✅ Waveform design and characteristics
- ✅ Filter theory and implementation
- ✅ Effect algorithms (distortion, reverb, chorus, etc.)
- ✅ Modulation routing and LFO design
- ✅ Envelope and ADSR patterns
- ✅ DSP theory and calculations
- ✅ Voice management and polyphony
- ✅ General synth.js architecture questions

**Skills available:**
- `synthesis` — Deep knowledge on sound generation, DSP theory, Web Audio patterns

---

## Agent Selection Quick Reference

| Your Task | Best Agent |
|-----------|-----------|
| "I want to add reverb" | `@audio-bus-chain` |
| "Why does reverb sound metallic?" | Default (use synthesis) |
| "Effects aren't connecting properly" | `@audio-bus-chain` |
| "How do reverb algorithms work?" | Default (use synthesis) |
| "Master output too quiet/loud" | `@audio-bus-chain` |
| "Design filter sweeps" | Default (use synthesis) |
| "Clicking and popping when I change parameters" | `@audio-bus-chain` |
| "How should I tune filter resonance?" | Default (use synthesis) |

---

## How Agents Get Invoked

### 1. **Automatic Subagent Delegation**
When you ask about relevant topics, the default agent recognizes keywords in the audio-bus-chain description and automatically delegates:

```
You: "I'm adding an effect but the output sounds wrong"
→ Default agent recognizes "adding effect" + "output"
→ Delegates to @audio-bus-chain
→ Specialized agent handles your request
```

**Works best when:** Your prompt mentions keywords like:
- "effects chain"
- "signal routing"
- "gain staging"
- "clipping/distortion"
- "master output"
- "bypass"
- "effect order"

### 2. **Manual Agent Selection**
You can explicitly invoke the agent:

```
@audio-bus-chain Reorder my effects - reverb should be last, not first
```

**Always use manual selection for:**
- Specific troubleshooting sessions
- Complex signal flow design
- When unsure if automatic delegation worked

### 3. **Agent Picker UI**
In VS Code Copilot Chat:
1. Type your question
2. Look for agent suggestions (appears as buttons/pills)
3. Click to select `Audio Bus & Effects Chain`

---

## Best Practices for Getting Good Results

### ✅ DO:
- **Use specific keywords** in your question: "effects chain," "routing," "gain staging," "master bus"
- **Explicitly invoke with `@audio-bus-chain`** when dealing with signal flow
- **Reference the troubleshooting guide** for known issues: "I'm getting clicking like issue #3 in TROUBLESHOOTING"
- **Provide context:** "I have 8 polyphonic voices, and my master is clipping"
- **Use the configuration templates** as starting points: "Start with the Warmth configuration and add..."

### ❌ DON'T:
- Use generic questions without context ("why is my sound bad?")
- Ask about oscillator waveforms via `@audio-bus-chain` (use default + synthesis)
- Expect the agent to guess what you're trying to fix
- Mix multiple unrelated topics in one prompt

---

## Example Workflow

**Typical task: Add reverb and optimize gain**

```
You: @audio-bus-chain
     I need to add reverb to my effects chain and fix clipping issues.
     I have 16 polyphonic voices and the master is peaking.

@audio-bus-chain:
  1. Diagnoses polyphonic gain scaling issue (1/16 = -24dB per voice)
  2. Suggests reverb placement (last in chain)
  3. References BUS-CONFIGS.md for complete setup
  4. Provides gain staging calculations
  5. Gives you working code

You: The reverb sounds too bright. Can you filter the highs?

@audio-bus-chain:
  References filter-design.md from synthesis skill
  Adds lowpass before reverb, explains why
  Provides updated code
```

---

## Troubleshooting Agent Discovery

**If the agent isn't being invoked automatically:**

1. **Use explicit `@` invocation**
   ```
   @audio-bus-chain I need help with my effects chain
   ```

2. **Include keyword-rich descriptions**
   - Use terms from description: "effects," "routing," "gain," "clipping," "master"
   - Specific: "I'm getting clipping at the master output" (not just "it sounds bad")

3. **Check the description**
   - View agent file: `.github/agents/audio-bus-chain.agent.md`
   - Look for keywords in the `description` field (line 2)
   - Your keywords should match common synthesis terms

4. **Verify user-invocable flag**
   - Ensure frontmatter has `user-invocable: true`
   - This enables manual agent selection

---

## Resources

- **Synthesis Theory** → [skills/synthesis/SKILL.md](./skills/synthesis/SKILL.md)
- **Audio Bus Troubleshooting** → [agents/audio-bus-chain/TROUBLESHOOTING.md](./agents/audio-bus-chain/TROUBLESHOOTING.md)
- **Ready-to-Use Configurations** → [agents/audio-bus-chain/BUS-CONFIGS.md](./agents/audio-bus-chain/BUS-CONFIGS.md)

---

## Testing Agent Invocation

**To verify the agent is properly discoverable:**

1. Type this prompt in Copilot Chat:
   ```
   I'm adding distortion to my effects chain but the output is distorted wrong
   ```
   → You should see `@audio-bus-chain` suggested as an agent

2. Manually invoke:
   ```
   @audio-bus-chain Explain the signal flow from voices to master output
   ```
   → Audio Bus & Effects Chain agent should respond

3. If automatic delegation works, try:
   ```
   The effects chain is causing clipping at 8 voices
   ```
   → Without explicit `@`, agent should still be suggested/involved
