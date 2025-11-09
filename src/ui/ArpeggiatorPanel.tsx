/**
 * ArpeggiatorPanel - Arpeggiator controls UI
 */

import { useState, useEffect, useCallback } from 'react';
import { useSynthEngine } from '../context/SynthContext';
import { ArpeggiatorManager } from '../core/ArpeggiatorManager';
import type { ArpPattern, NoteDivision } from '../core/ArpeggiatorManager';
import { Slider } from './common/Slider';
import { Switch } from './common/Switch';

const ARP_PATTERNS: { value: ArpPattern; label: string }[] = [
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
  { value: 'updown', label: 'Up-Down' },
  { value: 'updown2', label: 'Up-Down 2' },
  { value: 'converge', label: 'Converge' },
  { value: 'diverge', label: 'Diverge' },
  { value: 'random', label: 'Random' },
  { value: 'pinchedUp', label: 'Pinched Up' },
  { value: 'pinchedDown', label: 'Pinched Down' },
];

const NOTE_DIVISIONS: { value: NoteDivision; label: string }[] = [
  { value: '1/4', label: '1/4' },
  { value: '1/8', label: '1/8' },
  { value: '1/16', label: '1/16' },
  { value: '1/8T', label: '1/8T' },
  { value: '1/16T', label: '1/16T' },
  { value: '1/32', label: '1/32' },
];

export function ArpeggiatorPanel() {
  const { engine: synthEngine } = useSynthEngine();
  
  // Safely get manager
  let arpManager;
  try {
    arpManager = synthEngine.getArpeggiatorManager();
  } catch {
    arpManager = null;
  }

  const [enabled, setEnabled] = useState(false);
  const [pattern, setPattern] = useState<ArpPattern>('up');
  const [octaves, setOctaves] = useState(1);
  const [tempo, setTempo] = useState(120);
  const [division, setDivision] = useState<NoteDivision>('1/16');
  const [gateLength, setGateLength] = useState(80); // 0-100%
  const [noteHold, setNoteHold] = useState(false);
  
  // Progression state
  const [useProgression, setUseProgression] = useState(false);
  const [selectedProgression, setSelectedProgression] = useState('major-i-iv-v');
  const [rootNote, setRootNote] = useState(60); // C4
  const [barsPerChord, setBarsPerChord] = useState(1);
  const [availableProgressions, setAvailableProgressions] = useState<Array<{ key: string; name: string }>>([]);

  // Load available progressions
  useEffect(() => {
    const progressionKeys = ArpeggiatorManager.getProgressionNames();
    const progressions = progressionKeys.map((key: string) => {
      const prog = ArpeggiatorManager.getProgression(key);
      return { key, name: prog?.name || key };
    });
    setAvailableProgressions(progressions);
  }, []);

  // Consolidated useEffect for all manager updates
  useEffect(() => {
    if (!arpManager) return;
    
    // Set enabled state
    arpManager.setEnabled(enabled);
    
    // Set parameters
    arpManager.setPattern(pattern);
    arpManager.setOctaves(octaves);
    arpManager.setTempo(tempo);
    arpManager.setDivision(division);
    arpManager.setGateLength(gateLength / 100);
    arpManager.setNoteHold(noteHold);
    
    // Handle progression
    if (useProgression) {
      arpManager.setProgression(selectedProgression, rootNote, barsPerChord);
    } else {
      arpManager.clearProgression();
    }
  }, [arpManager, enabled, pattern, octaves, tempo, division, gateLength, noteHold, useProgression, selectedProgression, rootNote, barsPerChord]);

  const handleToggle = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled]);

  const handlePatternChange = useCallback((p: ArpPattern) => {
    setPattern(p);
  }, []);

  const handleOctavesChange = useCallback((val: number) => {
    setOctaves(val);
  }, []);

  const handleTempoChange = useCallback((val: number) => {
    setTempo(val);
  }, []);

  const handleDivisionChange = useCallback((d: NoteDivision) => {
    setDivision(d);
  }, []);

  const handleGateLengthChange = useCallback((val: number) => {
    setGateLength(val);
  }, []);

  const handleNoteHoldChange = useCallback((checked: boolean) => {
    setNoteHold(checked);
  }, []);

  return (
    <div className="arp-panel">
      {/* Enable/Disable Toggle */}
      <div className="arp-enable-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <Switch
          checked={enabled}
          onChange={handleToggle}
          disabled={!arpManager}
          label={enabled ? 'ARPEGGIATOR ON' : 'ARPEGGIATOR OFF'}
          labelPosition="right"
        />
        {enabled && (
          <p className="control-hint" style={{ textAlign: 'center' }}>
            Play notes on the keyboard to arpeggiate them
          </p>
        )}
      </div>

      {/* Pattern Selection */}
      <div className="control-group">
        <label className="control-label">Pattern</label>
        <div className="pattern-grid">
          {ARP_PATTERNS.map((p) => (
            <button
              key={p.value}
              className={`pattern-btn primary ${pattern === p.value ? 'active' : ''}`}
              onClick={() => handlePatternChange(p.value)}
              disabled={!arpManager}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls Group - All sliders together */}
      <div className="control-group">
        <div className="controls-row">
          <Slider
            label="Octaves"
            initialValue={octaves}
            min={1}
            max={4}
            step={1}
            onChange={handleOctavesChange}
          />
          <Slider
            label="Tempo"
            initialValue={tempo}
            min={40}
            max={300}
            step={1}
            unit=" BPM"
            onChange={handleTempoChange}
          />
        </div>

        <div className="controls-row">
          <Slider
            label="Gate"
            initialValue={gateLength}
            min={10}
            max={100}
            step={1}
            unit="%"
            onChange={handleGateLengthChange}
          />
          <div style={{ flex: 1 }}>
            <label className="control-label">Division</label>
            <div className="division-buttons">
              {NOTE_DIVISIONS.map((d) => (
                <button
                  key={d.value}
                  className={`division-btn info ${division === d.value ? 'active' : ''}`}
                  onClick={() => handleDivisionChange(d.value)}
                  disabled={!arpManager}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="controls-row">
          <Switch
            checked={noteHold}
            onChange={handleNoteHoldChange}
            disabled={!arpManager}
            label="Note Hold (legato)"
            labelPosition="right"
          />
        </div>
      </div>

      {/* Chord Progressions */}
      <div className="control-group progression-section">
        <Switch
          checked={useProgression}
          onChange={setUseProgression}
          disabled={!arpManager || !enabled}
          label="CHORD PROGRESSION"
          labelPosition="right"
        />
        
        {!enabled && (
          <p className="control-hint" style={{ color: '#ff6b6b' }}>
            Enable arpeggiator first to use progressions
          </p>
        )}
        
        {useProgression && enabled && (
          <>
            <div className="controls-row">
              {/* Progression Select */}
              <div className="control-group">
                <label className="control-label">Progression</label>
                <select
                  value={selectedProgression}
                  onChange={(e) => setSelectedProgression(e.target.value)}
                  disabled={!arpManager}
                  className="progression-select"
                >
                  {availableProgressions.map((prog) => (
                    <option key={prog.key} value={prog.key}>
                      {prog.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Root Note */}
              <div className="control-group">
                <label className="control-label">Root Note</label>
                <select
                  value={rootNote}
                  onChange={(e) => setRootNote(Number(e.target.value))}
                  disabled={!arpManager}
                  className="note-select"
                >
                  <option value={36}>C2</option>
                  <option value={48}>C3</option>
                  <option value={60}>C4</option>
                  <option value={72}>C5</option>
                  <option value={84}>C6</option>
                </select>
              </div>

              {/* Bars per Chord */}
              <div className="control-group">
                <Slider
                  label="Bars/Chord"
                  initialValue={barsPerChord}
                  min={1}
                  max={8}
                  step={1}
                  onChange={setBarsPerChord}
                />
              </div>
            </div>
            
            <p className="control-hint" style={{ color: '#00ff88' }}>
              Press ANY key to start the progression - chords will change automatically every {barsPerChord} bar{barsPerChord > 1 ? 's' : ''}
            </p>
          </>
        )}
      </div>

      {!arpManager && (
        <div className="warning-message">
          Audio engine not initialized. Click anywhere to start.
        </div>
      )}
    </div>
  );
}


