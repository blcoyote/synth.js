/**
 * SequencerPanel - Step sequencer UI
 */

import { useState, useEffect, useCallback } from 'react';
import { useSynthEngine } from '../context/SynthContext';
import type { SequencerMode } from '../core/SequencerManager';
import { Slider } from './common/Slider';
import { Switch } from './common/Switch';

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

  const [enabled, setEnabled] = useState(false);
  const [noteHold, setNoteHold] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordStep, setRecordStep] = useState(0);
  const [mode, setMode] = useState<SequencerMode>('forward');
  const [stepCount, setStepCount] = useState(16);
  const [tempo, setTempo] = useState(120);
  const [swing, setSwing] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedStep, setSelectedStep] = useState(0);
  
  // Step edit values
  const [stepGate, setStepGate] = useState(false);
  const [stepPitch, setStepPitch] = useState(0); // Changed to interval (0-11)
  const [stepVelocity, setStepVelocity] = useState(100);
  const [stepLength, setStepLength] = useState(80); // 0-100%

  // Consolidated useEffect for manager updates
  useEffect(() => {
    if (!seqManager) return;
    
    seqManager.setEnabled(enabled);
    seqManager.setNoteHold(noteHold);
    seqManager.setMode(mode);
    seqManager.setTempo(tempo);
    seqManager.setSwing(swing / 100);
  }, [seqManager, enabled, noteHold, mode, tempo, swing]);

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

  const handleToggle = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled]);

  const handleNoteHoldToggle = useCallback(() => {
    setNoteHold(!noteHold);
  }, [noteHold]);

  const handleReset = useCallback(() => {
    if (!seqManager) return;
    seqManager.reset();
    setCurrentStep(0);
  }, [seqManager]);

  const handleRecordToggle = useCallback(() => {
    if (!seqManager) return;
    
    if (isRecording) {
      seqManager.stopRecording();
      setIsRecording(false);
      setRecordStep(0);
    } else {
      seqManager.startRecording();
      setIsRecording(true);
      setRecordStep(0);
      
      // Listen for step updates during recording
      seqManager.onStep((stepIndex: number) => {
        setRecordStep(stepIndex);
      });
    }
  }, [seqManager, isRecording]);

  const handleRecordRest = useCallback(() => {
    if (!seqManager || !isRecording) return;
    seqManager.recordRest();
  }, [seqManager, isRecording]);

  const handleStepCountChange = useCallback((count: typeof STEP_COUNTS[number]) => {
    if (!seqManager) return;
    seqManager.setSteps(count);
    setStepCount(count);
    if (selectedStep >= count) {
      setSelectedStep(0);
    }
  }, [seqManager, selectedStep]);

  const handleStepClick = useCallback((index: number) => {
    setSelectedStep(index);
  }, []);

  const handleStepGateToggle = useCallback((index: number) => {
    if (!seqManager) return;
    
    const step = seqManager.getStep(index);
    if (step) {
      seqManager.setStep(index, { gate: !step.gate });
      if (index === selectedStep) {
        setStepGate(!step.gate);
      }
    }
  }, [seqManager, selectedStep]);

  const handleStepGateChange = useCallback((gate: boolean) => {
    if (!seqManager) return;
    seqManager.setStep(selectedStep, { gate });
    setStepGate(gate);
  }, [seqManager, selectedStep]);

  const handleStepPitchChange = useCallback((pitch: number) => {
    if (!seqManager) return;
    seqManager.setStep(selectedStep, { pitch });
    setStepPitch(pitch);
  }, [seqManager, selectedStep]);

  const handleStepVelocityChange = useCallback((velocity: number) => {
    if (!seqManager) return;
    seqManager.setStep(selectedStep, { velocity });
    setStepVelocity(velocity);
  }, [seqManager, selectedStep]);

  const handleStepLengthChange = useCallback((length: number) => {
    if (!seqManager) return;
    seqManager.setStep(selectedStep, { length: length / 100 });
    setStepLength(length);
  }, [seqManager, selectedStep]);

  const handleClear = useCallback(() => {
    if (!seqManager) return;
    seqManager.clear();
    setStepGate(false);
  }, [seqManager]);

  const handleRandomize = useCallback(() => {
    if (!seqManager) return;
    seqManager.randomize(0.5);
    
    // Reload selected step
    const step = seqManager.getStep(selectedStep);
    if (step) {
      setStepGate(step.gate);
      setStepPitch(step.pitch);
      setStepVelocity(step.velocity);
    }
  }, [seqManager, selectedStep]);

  const handleModeChange = useCallback((m: SequencerMode) => {
    setMode(m);
  }, []);

  const handleTempoChange = useCallback((val: number) => {
    setTempo(val);
  }, []);

  const handleSwingChange = useCallback((val: number) => {
    setSwing(val);
  }, []);

  // Helper to display interval as semitones from root note
  const intervalToSemitones = useCallback((interval: number): string => {
    if (interval === 0) return '±0';
    return interval > 0 ? `+${interval}` : `${interval}`;
  }, []);

  return (
    <div className="seq-panel">
      {/* Enable/Disable Toggle */}
      <div className="seq-enable-section">
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Switch
            checked={enabled}
            onChange={handleToggle}
            disabled={!seqManager}
            label={enabled ? 'SEQUENCER ON' : 'SEQUENCER OFF'}
            labelPosition="right"
          />
        </div>
        {enabled && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <p className="control-hint" style={{ textAlign: 'center', margin: 0 }}>
              Play a root note on keyboard to start sequencing
            </p>
            <Switch
              checked={noteHold}
              onChange={handleNoteHoldToggle}
              disabled={!seqManager}
              label="Note Hold (Latch Mode)"
            />
          </div>
        )}
      </div>

      {/* Transport Controls */}
      <div className="seq-transport">
        <button
          className={`transport-btn ${isRecording ? 'danger' : 'info'}`}
          onClick={handleRecordToggle}
          disabled={!seqManager}
          style={{ fontWeight: isRecording ? 700 : 400 }}
        >
          {isRecording ? 'Stop Recording' : 'Record'}
        </button>
        {isRecording && (
          <button
            className="transport-btn warning"
            onClick={handleRecordRest}
            disabled={!seqManager}
          >
            Add Rest
          </button>
        )}
        <button
          className="transport-btn success"
          onClick={handleReset}
          disabled={!seqManager || isRecording}
        >
          Reset
        </button>
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="recording-status">
          <span style={{ color: '#ff4444', fontWeight: 700 }}>
            RECORDING - Step {recordStep + 1}/{stepCount}
          </span>
          <p className="control-hint" style={{ margin: '0.25rem 0 0 0' }}>
            Play notes on keyboard to record, or press "Add Rest" for empty steps
          </p>
        </div>
      )}

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

      {/* Mode and Controls - Grouped together */}
      <div className="control-group">
        <div className="controls-row">
          <div style={{ flex: 1 }}>
            <label className="control-label">Mode</label>
            <div className="mode-buttons">
              {SEQUENCER_MODES.map((m) => (
                <button
                  key={m.value}
                  className={`mode-btn-small primary ${mode === m.value ? 'active' : ''}`}
                  onClick={() => handleModeChange(m.value)}
                  disabled={!seqManager}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="controls-row">
          <Slider
            label="Tempo"
            initialValue={tempo}
            min={40}
            max={300}
            step={1}
            unit=" BPM"
            onChange={handleTempoChange}
          />
          <Slider
            label="Swing"
            initialValue={swing}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={handleSwingChange}
          />
        </div>
      </div>

      {/* Step Editor - All controls in one group */}
      <div className="step-editor">
        <div className="step-editor-header">
          <h3>Step {selectedStep + 1}</h3>
          <Switch
            checked={stepGate}
            onChange={handleStepGateChange}
            disabled={!seqManager}
            label="Gate"
          />
        </div>

        <div className="controls-row">
          <Slider
            label="Interval"
            initialValue={stepPitch}
            min={-12}
            max={12}
            step={1}
            unit=" semitones"
            formatValue={(val) => intervalToSemitones(val)}
            onChange={handleStepPitchChange}
          />
          <Slider
            label="Velocity"
            initialValue={stepVelocity}
            min={1}
            max={127}
            step={1}
            onChange={handleStepVelocityChange}
          />
        </div>

        <div className="controls-row">
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


