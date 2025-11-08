/**
 * SequencerPanel - Step sequencer UI
 */

import { useState, useEffect } from 'react';
import { useSynthEngine } from '../context/SynthContext';
import type { SequencerMode } from '../core/SequencerManager';
import { Slider } from './common/Slider';

const SEQUENCER_MODES: { value: SequencerMode; label: string }[] = [
  { value: 'forward', label: 'Forward' },
  { value: 'reverse', label: 'Reverse' },
  { value: 'pingpong', label: 'Ping-Pong' },
  { value: 'random', label: 'Random' },
];

const STEP_COUNTS = [4, 8, 16, 32, 64] as const;

export function SequencerPanel() {
  const { engine: synthEngine } = useSynthEngine();
  
  // Safely get manager
  let seqManager;
  try {
    seqManager = synthEngine.getSequencerManager();
  } catch {
    seqManager = null;
  }

  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<SequencerMode>('forward');
  const [stepCount, setStepCount] = useState(16);
  const [tempo, setTempo] = useState(120);
  const [swing, setSwing] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedStep, setSelectedStep] = useState(0);
  
  // Step edit values
  const [stepGate, setStepGate] = useState(false);
  const [stepPitch, setStepPitch] = useState(60);
  const [stepVelocity, setStepVelocity] = useState(100);
  const [stepLength, setStepLength] = useState(80); // 0-100%

  // Update manager when settings change
  useEffect(() => {
    if (!seqManager) return;
    seqManager.setMode(mode);
  }, [seqManager, mode]);

  useEffect(() => {
    if (!seqManager) return;
    seqManager.setTempo(tempo);
  }, [seqManager, tempo]);

  useEffect(() => {
    if (!seqManager) return;
    seqManager.setSwing(swing / 100);
  }, [seqManager, swing]);

  // Listen for step changes during playback
  useEffect(() => {
    if (!seqManager) return;
    
    seqManager.onStep((stepIndex: number) => {
      setCurrentStep(stepIndex);
    });
  }, [seqManager]);

  // Load selected step data
  useEffect(() => {
    if (!seqManager) return;
    
    const step = seqManager.getStep(selectedStep);
    if (step) {
      setStepGate(step.gate);
      setStepPitch(step.pitch);
      setStepVelocity(step.velocity);
      setStepLength(step.length * 100);
    }
  }, [seqManager, selectedStep]);

  const handlePlayPause = () => {
    if (!seqManager) return;

    if (isPlaying) {
      seqManager.pause();
      setIsPlaying(false);
    } else {
      seqManager.start();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    if (!seqManager) return;
    seqManager.stop();
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const handleReset = () => {
    if (!seqManager) return;
    seqManager.reset();
    setCurrentStep(0);
  };

  const handleStepCountChange = (count: typeof STEP_COUNTS[number]) => {
    if (!seqManager) return;
    seqManager.setSteps(count);
    setStepCount(count);
    if (selectedStep >= count) {
      setSelectedStep(0);
    }
  };

  const handleStepClick = (index: number) => {
    setSelectedStep(index);
  };

  const handleStepGateToggle = (index: number) => {
    if (!seqManager) return;
    
    const step = seqManager.getStep(index);
    if (step) {
      seqManager.setStep(index, { gate: !step.gate });
      if (index === selectedStep) {
        setStepGate(!step.gate);
      }
    }
  };

  const handleStepGateChange = (gate: boolean) => {
    if (!seqManager) return;
    seqManager.setStep(selectedStep, { gate });
    setStepGate(gate);
  };

  const handleStepPitchChange = (pitch: number) => {
    if (!seqManager) return;
    seqManager.setStep(selectedStep, { pitch });
    setStepPitch(pitch);
  };

  const handleStepVelocityChange = (velocity: number) => {
    if (!seqManager) return;
    seqManager.setStep(selectedStep, { velocity });
    setStepVelocity(velocity);
  };

  const handleStepLengthChange = (length: number) => {
    if (!seqManager) return;
    seqManager.setStep(selectedStep, { length: length / 100 });
    setStepLength(length);
  };

  const handleClear = () => {
    if (!seqManager) return;
    seqManager.clear();
    setStepGate(false);
  };

  const handleRandomize = () => {
    if (!seqManager) return;
    seqManager.randomize(0.5);
    
    // Reload selected step
    const step = seqManager.getStep(selectedStep);
    if (step) {
      setStepGate(step.gate);
      setStepPitch(step.pitch);
      setStepVelocity(step.velocity);
    }
  };

  // Helper to convert MIDI note to note name
  const midiToNoteName = (midi: number): string => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const noteName = noteNames[midi % 12];
    return `${noteName}${octave}`;
  };

  return (
    <div className="seq-panel">
      {/* Transport Controls */}
      <div className="seq-transport">
        <button
          className={`transport-btn success ${isPlaying ? 'active' : ''}`}
          onClick={handlePlayPause}
          disabled={!seqManager}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          className="transport-btn success"
          onClick={handleStop}
          disabled={!seqManager || !isPlaying}
        >
          ⏹ Stop
        </button>
        <button
          className="transport-btn success"
          onClick={handleReset}
          disabled={!seqManager}
        >
          ⏮ Reset
        </button>
      </div>

      {/* Step Count Selection */}
      <div className="control-group">
        <label className="control-label">Steps</label>
        <div className="step-count-buttons">
          {STEP_COUNTS.map((count) => (
            <button
              key={count}
              className={`step-count-btn primary ${stepCount === count ? 'active' : ''}`}
              onClick={() => handleStepCountChange(count)}
              disabled={!seqManager}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Step Grid */}
      <div className="step-grid-container">
        <div className="step-grid" style={{ gridTemplateColumns: `repeat(${Math.min(stepCount, 16)}, 1fr)` }}>
          {Array.from({ length: stepCount }, (_, i) => {
            const step = seqManager?.getStep(i);
            const isActive = step?.gate || false;
            const isCurrent = currentStep === i;
            const isSelected = selectedStep === i;
            
            return (
              <div
                key={i}
                className={`step-button ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleStepClick(i)}
                onDoubleClick={() => handleStepGateToggle(i)}
                title={`Step ${i + 1}\nDouble-click to toggle`}
              >
                <span className="step-number">{i + 1}</span>
                {isCurrent && <div className="playhead-indicator"></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mode and Controls */}
      <div className="controls-row">
        <div className="control-group">
          <label className="control-label">Mode</label>
          <div className="mode-buttons">
            {SEQUENCER_MODES.map((m) => (
              <button
                key={m.value}
                className={`mode-btn-small primary ${mode === m.value ? 'active' : ''}`}
                onClick={() => setMode(m.value)}
                disabled={!seqManager}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="controls-row">
        <div className="control-group">
          <Slider
            label="Tempo"
            initialValue={tempo}
            min={40}
            max={300}
            step={1}
            unit=" BPM"
            onChange={setTempo}
          />
        </div>
        <div className="control-group">
          <Slider
            label="Swing"
            initialValue={swing}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={setSwing}
          />
        </div>
      </div>

      {/* Step Editor */}
      <div className="step-editor">
        <div className="step-editor-header">
          <h3>Step {selectedStep + 1}</h3>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={stepGate}
              onChange={(e) => handleStepGateChange(e.target.checked)}
              disabled={!seqManager}
            />
            <span>Gate</span>
          </label>
        </div>

        <div className="controls-row">
          <div className="control-group">
            <Slider
              label="Note"
              initialValue={stepPitch}
              min={36}
              max={84}
              step={1}
              formatValue={(val) => midiToNoteName(val)}
              onChange={handleStepPitchChange}
            />
          </div>
          <div className="control-group">
            <Slider
              label="Velocity"
              initialValue={stepVelocity}
              min={1}
              max={127}
              step={1}
              onChange={handleStepVelocityChange}
            />
          </div>
        </div>

        <div className="controls-row">
          <div className="control-group">
            <Slider
              label="Length"
              initialValue={stepLength}
              min={10}
              max={100}
              step={1}
              unit="%"
              onChange={handleStepLengthChange}
            />
          </div>
        </div>
      </div>

      {/* Pattern Tools */}
      <div className="pattern-tools">
        <button
          className="tool-btn info"
          onClick={handleClear}
          disabled={!seqManager}
        >
          Clear
        </button>
        <button
          className="tool-btn info"
          onClick={handleRandomize}
          disabled={!seqManager}
        >
          Randomize
        </button>
      </div>

      {!seqManager && (
        <div className="warning-message">
          Audio engine not initialized. Click anywhere to start.
        </div>
      )}
    </div>
  );
}
