/**
 * App - Main React application for Synth V2
 * Phase 1: Get audio working with basic oscillator controls
 */

import { useState, useEffect } from 'react';
import { SynthProvider, useSynthEngine } from './context/SynthContext';
import { SynthEngine } from './core/SynthEngine';
import { OscillatorPanel } from './components/OscillatorPanel';
import { EnvelopePanel } from './components/EnvelopePanel';
import { SimpleKeyboard } from './components/SimpleKeyboard';
import { PresetPanel } from './components/PresetPanel';
import { FilterPanel } from './components/FilterPanel';
import { EffectsPanel } from './components/EffectsPanel';
import { LFOPanel } from './components/LFOPanel';
import { CollapsiblePanel } from './components/common/CollapsiblePanel';

// Create synth engine instance (singleton, created once)
const synthEngine = new SynthEngine();

function SynthControls() {
  const { engine } = useSynthEngine();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const handlePresetLoad = () => {
    // Force re-render of all components by changing the key
    setRefreshKey(prev => prev + 1);
  };

  // Auto-initialize on first user interaction (like v1)
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await engine.initialize();
        setIsInitialized(true);
        console.log('Audio engine initialized');
      } catch (err) {
        console.error('Failed to initialize audio:', err);
      }
    };

    const handleFirstInteraction = () => {
      initializeAudio();
    };

    // Listen for first click or keydown
    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [engine]);

  const handleStopAll = () => {
    if (isInitialized) {
      engine.getVoiceManager().stopAllNotes();
    }
  };

  return (
    <div className="synth-app">
      <header className="synth-header">
        <h1>🎹 Synth V2 - Phase 1</h1>
        <div className="header-controls">
          <button className="stop-btn" onClick={handleStopAll}>
            ⏹️ Stop All
          </button>
          <div className="voice-count">
            Active Voices: {isInitialized ? engine.getVoiceManager().getActiveVoiceCount() : 0}
          </div>
        </div>
      </header>

      <div className="main-content" key={refreshKey}>
        {/* Top Section: Presets */}
        <div className="top-section">
          <section className="presets-section">
            <CollapsiblePanel title="Presets" defaultOpen={false}>
              <PresetPanel onPresetLoad={handlePresetLoad} />
            </CollapsiblePanel>
          </section>
        </div>

        {/* Three Column Layout */}
        <div className="synth-layout-grid">
          
          {/* LEFT COLUMN: OSCILLATORS */}
          <div className="synth-column oscillators-column">
            <div className="column-header">
              <h2>🎵 Oscillators</h2>
            </div>
            <div className="column-content">
              <CollapsiblePanel title="Oscillator 1" defaultOpen={true}>
                <OscillatorPanel oscNum={1} />
              </CollapsiblePanel>
              <CollapsiblePanel title="Oscillator 2" defaultOpen={false}>
                <OscillatorPanel oscNum={2} />
              </CollapsiblePanel>
              <CollapsiblePanel title="Oscillator 3" defaultOpen={false}>
                <OscillatorPanel oscNum={3} />
              </CollapsiblePanel>
            </div>
          </div>

          {/* CENTER COLUMN: ENVELOPES & MODULATION */}
          <div className="synth-column envelopes-column">
            <div className="column-header">
              <h2>📈 Envelopes & Modulation</h2>
            </div>
            <div className="column-content">
              <CollapsiblePanel title="Envelope 1" defaultOpen={true}>
                <EnvelopePanel envNum={1} />
              </CollapsiblePanel>
              <CollapsiblePanel title="Envelope 2" defaultOpen={false}>
                <EnvelopePanel envNum={2} />
              </CollapsiblePanel>
              <CollapsiblePanel title="Envelope 3" defaultOpen={false}>
                <EnvelopePanel envNum={3} />
              </CollapsiblePanel>
              <CollapsiblePanel title="LFO" defaultOpen={true}>
                <LFOPanel />
              </CollapsiblePanel>
            </div>
          </div>

          {/* RIGHT COLUMN: FILTER & EFFECTS */}
          <div className="synth-column effects-column">
            <div className="column-header">
              <h2>🎛️ Filter & Effects</h2>
            </div>
            <div className="column-content">
              <CollapsiblePanel title="Master Filter" defaultOpen={true}>
                <FilterPanel />
              </CollapsiblePanel>
              <CollapsiblePanel title="Effects Chain" defaultOpen={true}>
                <EffectsPanel />
              </CollapsiblePanel>
            </div>
          </div>

        </div>

        {/* Keyboard Footer */}
        <section className="keyboard-section">
          <CollapsiblePanel title="Keyboard" defaultOpen={true}>
            <p style={{ marginBottom: '1rem', color: '#9ca3af' }}>
              Click keys or use your computer keyboard (AZSX... / QWER...) to play notes (C2-C5)
            </p>
            <SimpleKeyboard startOctave={2} octaves={3} extraKeys={1} />
          </CollapsiblePanel>
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
