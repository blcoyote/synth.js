/**
 * App - Main React application for Synth V2
 * Phase 1: Get audio working with basic oscillator controls
 */

import { useState } from 'react';
import { SynthProvider, useSynthEngine } from './context/SynthContext';
import { SynthEngine } from './core/SynthEngine';
import { OscillatorPanel } from './components/OscillatorPanel';
import { EnvelopePanel } from './components/EnvelopePanel';
import { SimpleKeyboard } from './components/SimpleKeyboard';
import { PresetPanel } from './components/PresetPanel';
import { FilterPanel } from './components/FilterPanel';
import { EffectsPanel } from './components/EffectsPanel';
import { LFOPanel } from './components/LFOPanel';

// Create synth engine instance (singleton, created once)
const synthEngine = new SynthEngine();

function SynthControls() {
  const { engine, voiceState } = useSynthEngine();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePresetLoad = () => {
    // Force re-render of all components by changing the key
    setRefreshKey(prev => prev + 1);
  };

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

      <div className="main-content" key={refreshKey}>
        {/* Presets */}
        <section className="presets-section">
          <PresetPanel onPresetLoad={handlePresetLoad} />
        </section>

        {/* Keyboard */}
        <section className="keyboard-section">
          <h2>Keyboard</h2>
          <p>Click keys or use your computer keyboard (AZSX... / QWER...) to play notes (C2-C5)</p>
          <SimpleKeyboard startOctave={2} octaves={3} extraKeys={1} />
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

        {/* Envelopes */}
        <section className="envelopes-section">
          <h2>Envelopes</h2>
          <div className="envelope-grid">
            <EnvelopePanel envNum={1} />
            <EnvelopePanel envNum={2} />
            <EnvelopePanel envNum={3} />
          </div>
        </section>

        {/* Filter */}
        <section className="filter-section">
          <h2>Filter</h2>
          <FilterPanel />
        </section>

        {/* Effects */}
        <section className="effects-section">
          <h2>Effects</h2>
          <EffectsPanel />
        </section>

        {/* LFO */}
        <section className="lfo-section">
          <h2>LFO</h2>
          <LFOPanel />
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
