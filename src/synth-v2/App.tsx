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
import { ArpeggiatorPanel } from './components/ArpeggiatorPanel';
import { SequencerPanel } from './components/SequencerPanel';
import { CollapsiblePanel } from './components/common/CollapsiblePanel';
import { voiceState, audioState } from '../state';

// Create synth engine instance (singleton, created once)
const synthEngine = new SynthEngine();

function SynthControls() {
  const { engine } = useSynthEngine();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeVoices, setActiveVoices] = useState(0);
  
  // Track oscillator enabled states (for envelope sync)
  const [osc1Enabled, setOsc1Enabled] = useState(true);
  const [osc2Enabled, setOsc2Enabled] = useState(false);
  const [osc3Enabled, setOsc3Enabled] = useState(false);
  
  // Arpeggiator / Sequencer mode
  const [arpSeqMode, setArpSeqMode] = useState<'arpeggiator' | 'sequencer'>('arpeggiator');

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

  // Update active voice count periodically
  useEffect(() => {
    if (!isInitialized) return;
    
    const updateVoiceCount = () => {
      try {
        setActiveVoices(engine.getVoiceManager().getActiveVoiceCount());
      } catch {
        // Ignore errors
      }
    };

    const interval = setInterval(updateVoiceCount, 100);
    return () => clearInterval(interval);
  }, [engine, isInitialized]);

  return (
    <div className="synth-app">
      <div className="main-content" key={refreshKey}>
        {/* Top Section: Status & Presets */}
        <div className="top-section">
          <div className="status-badge">
            <span className={`status-indicator ${isInitialized ? 'active' : 'inactive'}`}>
              {isInitialized ? '●' : '○'}
            </span>
            <span className="status-text">
              {isInitialized ? `${activeVoices} voices` : 'Click to start'}
            </span>
          </div>
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
              <CollapsiblePanel 
                title="Oscillator 1" 
                defaultOpen={true}
                showLed={true}
                onToggle={(isOpen) => {
                  const config = voiceState.oscillatorConfigs.get(1);
                  if (config) config.enabled = isOpen;
                  setOsc1Enabled(isOpen);
                }}
              >
                <OscillatorPanel oscNum={1} />
              </CollapsiblePanel>
              <CollapsiblePanel 
                title="Oscillator 2" 
                defaultOpen={false}
                showLed={true}
                onToggle={(isOpen) => {
                  const config = voiceState.oscillatorConfigs.get(2);
                  if (config) config.enabled = isOpen;
                  setOsc2Enabled(isOpen);
                }}
              >
                <OscillatorPanel oscNum={2} />
              </CollapsiblePanel>
              <CollapsiblePanel 
                title="Oscillator 3" 
                defaultOpen={false}
                showLed={true}
                onToggle={(isOpen) => {
                  const config = voiceState.oscillatorConfigs.get(3);
                  if (config) config.enabled = isOpen;
                  setOsc3Enabled(isOpen);
                }}
              >
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
              <CollapsiblePanel 
                title="Envelope 1" 
                isOpen={osc1Enabled}
                showLed={true}
              >
                <EnvelopePanel envNum={1} />
              </CollapsiblePanel>
              <CollapsiblePanel 
                title="Envelope 2" 
                isOpen={osc2Enabled}
                showLed={true}
              >
                <EnvelopePanel envNum={2} />
              </CollapsiblePanel>
              <CollapsiblePanel 
                title="Envelope 3" 
                isOpen={osc3Enabled}
                showLed={true}
              >
                <EnvelopePanel envNum={3} />
              </CollapsiblePanel>
              <CollapsiblePanel 
                title="LFO" 
                defaultOpen={true}
                showLed={true}
                onToggle={(isOpen) => {
                  // Enable/disable LFO based on panel state
                  try {
                    const lfoManager = engine.getLFOManager();
                    lfoManager.setEnabled(isOpen);
                  } catch {
                    // Manager not ready yet
                  }
                }}
              >
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
              <CollapsiblePanel 
                title="Master Filter" 
                defaultOpen={true}
                showLed={true}
                onToggle={(isOpen) => {
                  // Enable/disable filter based on panel state
                  audioState.filterSettings.enabled = isOpen;
                  
                  if (isOpen) {
                    // Enable filter with current cutoff
                    if (audioState.currentCustomFilter) {
                      audioState.currentCustomFilter.setParameter('cutoff', audioState.filterSettings.cutoff);
                    }
                  } else {
                    // Bypass filter (set cutoff to max)
                    if (audioState.currentCustomFilter) {
                      audioState.currentCustomFilter.setParameter('cutoff', 20000);
                    }
                  }
                }}
              >
                <FilterPanel />
              </CollapsiblePanel>
              <CollapsiblePanel title="Effects Chain" defaultOpen={true}>
                <EffectsPanel />
              </CollapsiblePanel>
            </div>
          </div>

        </div>

        {/* Arpeggiator / Sequencer Section */}
        <section className="arp-seq-section">
          <CollapsiblePanel title="Arpeggiator / Sequencer" defaultOpen={false}>
            <div className="arp-seq-container">
              <div className="mode-toggle">
                <button 
                  className={`mode-btn ${arpSeqMode === 'arpeggiator' ? 'active' : ''}`}
                  onClick={() => setArpSeqMode('arpeggiator')}
                >
                  Arpeggiator
                </button>
                <button 
                  className={`mode-btn ${arpSeqMode === 'sequencer' ? 'active' : ''}`}
                  onClick={() => setArpSeqMode('sequencer')}
                >
                  Sequencer
                </button>
              </div>
              <div className="arp-seq-content">
                {arpSeqMode === 'arpeggiator' ? (
                  <ArpeggiatorPanel />
                ) : (
                  <SequencerPanel />
                )}
              </div>
            </div>
          </CollapsiblePanel>
        </section>

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
