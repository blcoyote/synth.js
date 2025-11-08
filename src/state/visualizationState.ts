/**
 * Visualization State Module
 * 
 * Manages analysers and visualizers for audio visualization
 */

import type { WaveSurferVisualizer } from '../utils/WaveSurferVisualizer';

class VisualizationStateManager {
  // Analyser nodes
  private _analyser: AnalyserNode | null = null;
  private _analyser1: AnalyserNode | null = null;
  private _analyser2: AnalyserNode | null = null;
  private _analyser3: AnalyserNode | null = null;

  // Visualizers
  private _filterVisualizer: WaveSurferVisualizer | null = null;
  private _waveformVisualizer1: WaveSurferVisualizer | null = null;
  private _waveformVisualizer2: WaveSurferVisualizer | null = null;
  private _waveformVisualizer3: WaveSurferVisualizer | null = null;

  // Getters with null checks
  get analyser(): AnalyserNode {
    if (this._analyser === null) {
      throw new Error('Analyser is not initialized. Call initialize() first.');
    }
    return this._analyser;
  }

  get analyser1(): AnalyserNode {
    if (this._analyser1 === null) {
      throw new Error('Analyser1 is not initialized. Call initialize() first.');
    }
    return this._analyser1;
  }

  get analyser2(): AnalyserNode {
    if (this._analyser2 === null) {
      throw new Error('Analyser2 is not initialized. Call initialize() first.');
    }
    return this._analyser2;
  }

  get analyser3(): AnalyserNode {
    if (this._analyser3 === null) {
      throw new Error('Analyser3 is not initialized. Call initialize() first.');
    }
    return this._analyser3;
  }

  // Safe getters that return null instead of throwing
  getAnalyserOrNull(): AnalyserNode | null {
    return this._analyser;
  }

  getAnalyser1OrNull(): AnalyserNode | null {
    return this._analyser1;
  }

  getAnalyser2OrNull(): AnalyserNode | null {
    return this._analyser2;
  }

  getAnalyser3OrNull(): AnalyserNode | null {
    return this._analyser3;
  }

  get filterVisualizer() {
    return this._filterVisualizer;
  }

  get waveformVisualizer1() {
    return this._waveformVisualizer1;
  }

  get waveformVisualizer2() {
    return this._waveformVisualizer2;
  }

  get waveformVisualizer3() {
    return this._waveformVisualizer3;
  }

  // Setters
  setAnalyser(analyser: AnalyserNode | null) {
    this._analyser = analyser;
  }

  setAnalyser1(analyser: AnalyserNode | null) {
    this._analyser1 = analyser;
  }

  setAnalyser2(analyser: AnalyserNode | null) {
    this._analyser2 = analyser;
  }

  setAnalyser3(analyser: AnalyserNode | null) {
    this._analyser3 = analyser;
  }

  setFilterVisualizer(visualizer: WaveSurferVisualizer | null) {
    this._filterVisualizer = visualizer;
  }

  setWaveformVisualizer1(visualizer: WaveSurferVisualizer | null) {
    this._waveformVisualizer1 = visualizer;
  }

  setWaveformVisualizer2(visualizer: WaveSurferVisualizer | null) {
    this._waveformVisualizer2 = visualizer;
  }

  setWaveformVisualizer3(visualizer: WaveSurferVisualizer | null) {
    this._waveformVisualizer3 = visualizer;
  }
}

export const visualizationState = new VisualizationStateManager();
