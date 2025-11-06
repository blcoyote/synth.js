/**
 * WaveSurfer.js-based Audio Visualizer
 * High-performance visualization using the WaveSurfer.js library
 */

import WaveSurfer from 'wavesurfer.js';

export interface WaveSurferVisualizerConfig {
  container: HTMLElement;
  analyserNode: AnalyserNode | null;
  filterNode?: BiquadFilterNode | null;  // Optional: only needed for spectrum mode with filter curve
  filterEnabled?: boolean;  // Optional: only needed for spectrum mode
  cutoffFrequency?: number;  // Optional: only needed for spectrum mode
  sampleRate?: number;
  mode?: 'spectrum' | 'waveform';  // New: mode selection
  height?: number;  // New: optional height
}

export class WaveSurferVisualizer {
  private container: HTMLElement;
  private wavesurfer: WaveSurfer | null = null;
  private analyserNode: AnalyserNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private filterEnabled: boolean = true;
  private cutoffFrequency: number = 2000;
  private sampleRate: number;
  private mode: 'spectrum' | 'waveform' = 'spectrum';
  private height: number = 240;
  private animationId: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Reusable buffers
  private frequencyData: Uint8Array | null = null;
  private waveformData: Uint8Array | null = null;
  private filterMagResponse: Float32Array = new Float32Array(512);
  private filterPhaseResponse: Float32Array = new Float32Array(512);
  private filterFreqArray: Float32Array = new Float32Array(512);

  constructor(config: WaveSurferVisualizerConfig) {
    this.container = config.container;
    this.analyserNode = config.analyserNode;
    this.filterNode = config.filterNode || null;
    this.filterEnabled = config.filterEnabled || false;
    this.cutoffFrequency = config.cutoffFrequency || 1000;
    this.sampleRate = config.sampleRate || 48000;
    this.mode = config.mode || 'spectrum';
    this.height = config.height || 240;

    // Pre-calculate filter frequency array (logarithmic spacing)
    for (let i = 0; i < this.filterFreqArray.length; i++) {
      const normalizedX = i / (this.filterFreqArray.length - 1);
      const minFreq = 20;
      const maxFreq = this.sampleRate / 2;
      this.filterFreqArray[i] = minFreq * Math.pow(maxFreq / minFreq, normalizedX);
    }

    this.initWaveSurfer();
  }

  private initWaveSurfer(): void {
    if (!this.analyserNode) return;

    // Ensure container has proper height
    const heightPx = `${this.height}px`;
    if (!this.container.style.height || this.container.clientHeight < 100) {
      this.container.style.height = heightPx;
      this.container.style.minHeight = heightPx;
    }

    // Create WaveSurfer instance with frequency bars visualization
    this.wavesurfer = WaveSurfer.create({
      container: this.container,
      waveColor: '#8b5cf6',  // Brighter purple
      progressColor: '#10b981',
      cursorColor: 'transparent',
      barWidth: this.mode === 'waveform' ? 2 : 3,
      barGap: 1,
      barRadius: 2,
      height: this.height,
      normalize: true,
      backend: 'WebAudio',
      hideScrollbar: true,
    });

    // Create overlay canvas for filter curve
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.width = this.container.clientWidth || 400;
    this.canvas.height = this.height;

    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      this.ctx = ctx;
      this.container.style.position = 'relative';
      this.container.appendChild(this.canvas);
    }
  }

  public start(): void {
    if (this.animationId !== null) return;
    this.animate();
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    if (this.mode === 'waveform') {
      this.drawWaveform();
    } else {
      this.drawFrequencySpectrum();
      this.drawFilterCurve();
    }
    this.animationId = requestAnimationFrame(this.animate);
  };

  private drawFrequencySpectrum(): void {
    if (!this.analyserNode || !this.ctx || !this.canvas) return;

    const bufferLength = this.analyserNode.frequencyBinCount;
    if (!this.frequencyData || this.frequencyData.length !== bufferLength) {
      this.frequencyData = new Uint8Array(bufferLength);
    }
    this.analyserNode.getByteFrequencyData(this.frequencyData as any);

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear canvas with dark background
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, width, height);

    // Draw frequency bars with brighter colors
    const barWidth = Math.max(2, width / bufferLength);
    const nyquist = this.sampleRate / 2;

    for (let i = 0; i < bufferLength; i++) {
      // Logarithmic frequency mapping
      const freq = (i / bufferLength) * nyquist;
      const logPos = Math.log(freq / 20) / Math.log(nyquist / 20);
      const x = logPos * width;

      const value = this.frequencyData[i];
      const barHeight = (value / 255) * height * 0.9;  // Use more of the height

      // Create vibrant gradient from cyan to purple to pink
      const gradient = this.ctx.createLinearGradient(0, height - barHeight, 0, height);
      if (barHeight > height * 0.7) {
        // High peaks: bright pink/red
        gradient.addColorStop(0, '#f72585');
        gradient.addColorStop(0.5, '#b5179e');
        gradient.addColorStop(1, '#7209b7');
      } else if (barHeight > height * 0.4) {
        // Mid range: purple to blue
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#3b82f6');
      } else {
        // Low levels: cyan to blue
        gradient.addColorStop(0, '#06b6d4');
        gradient.addColorStop(1, '#0891b2');
      }

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      
      // Add glow effect for brighter bars
      if (value > 128) {
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = barHeight > height * 0.7 ? '#f72585' : '#8b5cf6';
        this.ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        this.ctx.shadowBlur = 0;
      }
    }
  }

  private drawFilterCurve(): void {
    if (!this.filterNode || !this.filterEnabled || !this.ctx || !this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Get filter frequency response
    this.filterNode.getFrequencyResponse(
      this.filterFreqArray as any,
      this.filterMagResponse as any,
      this.filterPhaseResponse as any
    );

    // Draw filter curve
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 2;

    const minFreq = 20;
    const maxFreq = this.sampleRate / 2;

    for (let i = 0; i < this.filterFreqArray.length; i++) {
      const freq = this.filterFreqArray[i];
      const magnitude = this.filterMagResponse[i];

      // Convert frequency to x position (logarithmic)
      const normalizedX = Math.log(freq / minFreq) / Math.log(maxFreq / minFreq);
      const x = normalizedX * width;

      // Convert magnitude to y position (dB scale)
      const dB = 20 * Math.log10(Math.max(magnitude, 0.00001));
      const normalizedY = Math.max(0, Math.min(1, (dB + 60) / 60));
      const y = height - normalizedY * height;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();

    // Draw cutoff marker
    const cutoffX = (Math.log(this.cutoffFrequency / minFreq) / Math.log(maxFreq / minFreq)) * width;
    this.ctx.strokeStyle = 'rgba(110, 231, 183, 0.8)';
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(cutoffX, 0);
    this.ctx.lineTo(cutoffX, height);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawWaveform(): void {
    if (!this.analyserNode || !this.ctx || !this.canvas) return;

    const bufferLength = this.analyserNode.fftSize;
    if (!this.waveformData || this.waveformData.length !== bufferLength) {
      this.waveformData = new Uint8Array(bufferLength);
    }
    this.analyserNode.getByteTimeDomainData(this.waveformData as any);

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear canvas
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, width, height);

    // Draw center line
    this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, height / 2);
    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();

    // Draw waveform
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#10b981';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = '#10b981';
    this.ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = this.waveformData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  public updateConfig(config: Partial<WaveSurferVisualizerConfig>): void {
    if (config.analyserNode !== undefined) this.analyserNode = config.analyserNode;
    if (config.filterNode !== undefined) this.filterNode = config.filterNode;
    if (config.filterEnabled !== undefined) this.filterEnabled = config.filterEnabled;
    if (config.cutoffFrequency !== undefined) this.cutoffFrequency = config.cutoffFrequency;
  }

  public destroy(): void {
    this.stop();
    if (this.wavesurfer) {
      this.wavesurfer.destroy();
      this.wavesurfer = null;
    }
    if (this.canvas) {
      this.canvas.remove();
    }
  }
}
