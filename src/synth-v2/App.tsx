/**
 * App - Main React application for Synth V2
 * Phase 1: Get audio working with basic oscillator controls
 */

import { useState } from 'react';
import { SynthProvider, useSynthEngine } from './context/SynthContext';
import { SynthEngine } from './core/SynthEngine';
import { OscillatorPanel } from './components/OscillatorPanel';
import { SimpleKeyboard } from './components/SimpleKeyboard';

// Create synth engine instance (singleton, created once)
const synthEngine = new SynthEngine();

function SynthControls() {
  const { engine, voiceState } = useSynthEngine();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartAudio = async () => {
    try {
      await engine.initialize();
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize audio');
      console.error('Failed to initialize:', err);
    }
  };

  const handleStopAll = () => {
    engine.getVoiceManager().stopAllNotes();
  };

  // Show "Start Audio" button until user clicks
  if (!isInitialized) {
    return (
      <div className="synth-app">
        <div className="start-screen">
          <h1>🎹 Synth V2 - Phase 1</h1>
          <p>Click the button below to start the audio engine</p>
          <button className="start-audio-btn" onClick={handleStartAudio}>
            🎵 Start Audio Engine
          </button>
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="synth-app">
      <header className="synth-header">
        <h1>🎹 Synth V2 - Phase 1</h1>
        <div className="header-controls">
          <button className="stop-btn" onClick={handleStopAll}>
            ⏹️ Stop All
          </button>
          <div className="voice-count">
            Active Voices: {engine.getVoiceManager().getActiveVoiceCount()}
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* Keyboard */}
        <section className="keyboard-section">
          <h2>Keyboard</h2>
          <p>Click keys to play notes (C3-B4)</p>
          <SimpleKeyboard startOctave={3} octaves={2} />
        </section>

        {/* Oscillators */}
        <section className="oscillators-section">
          <h2>Oscillators</h2>
          <div className="oscillator-grid">
            <OscillatorPanel oscNum={1} />
            <OscillatorPanel oscNum={2} />
            <OscillatorPanel oscNum={3} />
          </div>
        </section>

        {/* Status */}
        <section className="status-section">
          <h3>Status</h3>
          <div className="status-grid">
            <div className="status-item">✅ React + Web Audio</div>
            <div className="status-item">✅ Voice Management</div>
            <div className="status-item">✅ Real-time Parameters</div>
            <div className="status-item">
              🎛️ Osc 1: {voiceState.oscillatorConfigs.get(1)?.enabled ? 'ON' : 'OFF'}
            </div>
            <div className="status-item">
              🎛️ Osc 2: {voiceState.oscillatorConfigs.get(2)?.enabled ? 'ON' : 'OFF'}
            </div>
            <div className="status-item">
              🎛️ Osc 3: {voiceState.oscillatorConfigs.get(3)?.enabled ? 'ON' : 'OFF'}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SynthProvider engine={synthEngine}>
      <SynthControls />
    </SynthProvider>
  );
}
