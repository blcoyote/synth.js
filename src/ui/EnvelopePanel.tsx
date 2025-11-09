import { useState, useEffect, useCallback } from 'react';
import { useSynthEngine } from '../context/SynthContext';
import { voiceState } from "../state";
import { Slider } from './common/Slider';
import { EnvelopeVisualizer } from './EnvelopeVisualizer';

interface EnvelopePanelProps {
  envNum: 1 | 2 | 3;
}

/**
 * EnvelopePanel - ADSR envelope controls for an oscillator
 * 
 * Controls attack, decay, sustain, and release parameters.
 * Updates both config (for new notes) and active voices (for sustained notes).
 */
export function EnvelopePanel({ envNum }: EnvelopePanelProps) {
  const { engine } = useSynthEngine();
  
  // Safely get manager (will be null before initialization)
  let paramManager;
  try {
    paramManager = engine.getParameterManager();
  } catch {
    paramManager = null;
  }
  
  const envelope = voiceState.envelopeSettings[envNum];

  // Local state for real-time updates
  const [attack, setAttack] = useState(envelope.attack);
  const [decay, setDecay] = useState(envelope.decay);
  const [sustain, setSustain] = useState(envelope.sustain);
  const [release, setRelease] = useState(envelope.release);

  // Sync with envelope state on mount
  useEffect(() => {
    setAttack(envelope.attack);
    setDecay(envelope.decay);
    setSustain(envelope.sustain);
    setRelease(envelope.release);
  }, [envelope]);

  const handleAttackChange = useCallback((value: number) => {
    // Convert from ms (0-2000) to seconds (0-2.0)
    const seconds = value / 1000;
    setAttack(seconds);
    if (paramManager) paramManager.updateEnvelopeParameter(envNum, 'attack', seconds);
  }, [paramManager, envNum]);

  const handleDecayChange = useCallback((value: number) => {
    // Convert from ms (0-2000) to seconds (0-2.0)
    const seconds = value / 1000;
    setDecay(seconds);
    if (paramManager) paramManager.updateEnvelopeParameter(envNum, 'decay', seconds);
  }, [paramManager, envNum]);

  const handleSustainChange = useCallback((value: number) => {
    // Sustain is 0-100% -> 0-1.0
    const level = value / 100;
    setSustain(level);
    if (paramManager) paramManager.updateEnvelopeParameter(envNum, 'sustain', level);
  }, [paramManager, envNum]);

  const handleReleaseChange = useCallback((value: number) => {
    // Convert from ms (0-5000) to seconds (0-5.0)
    const seconds = value / 1000;
    setRelease(seconds);
    if (paramManager) paramManager.updateEnvelopeParameter(envNum, 'release', seconds);
  }, [paramManager, envNum]);

  return (
    <div className="envelope-panel">
      <h4>Envelope {envNum}</h4>
      
      {/* Visual display of ADSR curve */}
      <div className="envelope-visualizer-container">
        <EnvelopeVisualizer
          attack={attack}
          decay={decay}
          sustain={sustain}
          release={release}
        />
      </div>
      
      <div className="envelope-controls">
        <Slider
          label="Attack"
          min={1}
          max={2000}
          initialValue={envelope.attack * 1000}
          unit="ms"
          onChange={handleAttackChange}
        />

        <Slider
          label="Decay"
          min={1}
          max={2000}
          initialValue={envelope.decay * 1000}
          unit="ms"
          onChange={handleDecayChange}
        />

        <Slider
          label="Sustain"
          min={0}
          max={100}
          initialValue={envelope.sustain * 100}
          unit="%"
          onChange={handleSustainChange}
        />

        <Slider
          label="Release"
          min={10}
          max={5000}
          initialValue={envelope.release * 1000}
          unit="ms"
          onChange={handleReleaseChange}
        />
      </div>
    </div>
  );
}


