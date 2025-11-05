/**
 * Reusable Audio Visualizer
 * Displays filter response and waveform on a single canvas
 */

export interface VisualizerConfig {
  canvas: HTMLCanvasElement;
  filterNode: BiquadFilterNode | null;
  analyserNode: AnalyserNode | null;
  filterEnabled: boolean;
  cutoffFrequency: number;
  sampleRate?: number; // Optional, defaults to 48000
  showFilter?: boolean; // Optional, defaults to true
  showWaveform?: boolean; // Optional, defaults to true
}

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private filterNode: BiquadFilterNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private filterEnabled: boolean = true;
  private cutoffFrequency: number = 2000;
  private animationId: number | null = null;
  private sampleRate: number;
  private showFilter: boolean = true;
  private showWaveform: boolean = true;

  // Layout constants
  private readonly FILTER_HEIGHT_RATIO = 0.5; // Top half for filter response
  private readonly WAVEFORM_HEIGHT_RATIO = 0.5; // Bottom half for waveform
  private readonly PADDING = 10;

  // Color scheme
  private readonly COLORS = {
    background: '#0a0a0a',
    grid: '#1a1a1a',
    filterActive: '#10b981',
    filterInactive: '#4b5563',
    waveform: '#10b981',
    cutoffMarker: '#6ee7b7',
    text: '#6ee7b7',
    divider: '#2d2d2d'
  };

  constructor(config: VisualizerConfig) {
    this.canvas = config.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
    this.filterNode = config.filterNode;
    this.analyserNode = config.analyserNode;
    this.filterEnabled = config.filterEnabled;
    this.cutoffFrequency = config.cutoffFrequency;
    this.sampleRate = config.sampleRate || 48000; // Default to 48kHz if not provided
    this.showFilter = config.showFilter !== undefined ? config.showFilter : true;
    this.showWaveform = config.showWaveform !== undefined ? config.showWaveform : true;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<VisualizerConfig>): void {
    if (config.filterNode !== undefined) this.filterNode = config.filterNode;
    if (config.analyserNode !== undefined) this.analyserNode = config.analyserNode;
    if (config.filterEnabled !== undefined) this.filterEnabled = config.filterEnabled;
    if (config.cutoffFrequency !== undefined) this.cutoffFrequency = config.cutoffFrequency;
  }

  /**
   * Start visualization loop
   */
  public start(): void {
    if (this.animationId !== null) return;
    this.animate();
  }

  /**
   * Stop visualization loop
   */
  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Main animation loop
   */
  private animate = (): void => {
    this.draw();
    this.animationId = requestAnimationFrame(this.animate);
  };

  /**
   * Draw visualizations based on config
   */
  private draw(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear canvas
    this.ctx.fillStyle = this.COLORS.background;
    this.ctx.fillRect(0, 0, width, height);

    const showBoth = this.showFilter && this.showWaveform;

    if (showBoth) {
      // Calculate sections
      const filterHeight = height * this.FILTER_HEIGHT_RATIO;
      const waveformHeight = height * this.WAVEFORM_HEIGHT_RATIO;
      const waveformY = filterHeight;

      // Draw filter response (top half)
      this.drawFilterResponse(0, 0, width, filterHeight);

      // Draw divider line
      this.ctx.strokeStyle = this.COLORS.divider;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, waveformY);
      this.ctx.lineTo(width, waveformY);
      this.ctx.stroke();

      // Draw waveform (bottom half)
      this.drawWaveform(0, waveformY, width, waveformHeight);
    } else if (this.showFilter) {
      // Only filter response (full height)
      this.drawFilterResponse(0, 0, width, height);
    } else if (this.showWaveform) {
      // Only waveform (full height)
      this.drawWaveform(0, 0, width, height);
    }
  }

  /**
   * Draw filter frequency response
   */
  private drawFilterResponse(x: number, y: number, width: number, height: number): void {
    if (!this.filterNode) return;

    this.ctx.save();
    this.ctx.translate(x, y);

    // Draw grid
    this.drawGrid(width, height, 4);

    // Draw frequency response curve
    this.ctx.strokeStyle = this.filterEnabled ? this.COLORS.filterActive : this.COLORS.filterInactive;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    const nyquist = this.sampleRate / 2;

    for (let i = 0; i < width; i++) {
      // Logarithmic frequency scale (20 Hz to Nyquist)
      const freq = 20 * Math.pow(nyquist / 20, i / width);

      // Calculate filter magnitude response
      const magResponse = new Float32Array(1);
      const phaseResponse = new Float32Array(1);
      const freqArray = new Float32Array([freq]);

      this.filterNode.getFrequencyResponse(freqArray, magResponse, phaseResponse);

      // Convert to dB and map to canvas height
      const db = 20 * Math.log10(Math.max(magResponse[0], 0.00001));
      const plotY = height / 2 - (db * height) / 60; // -30dB to +30dB range
      const clampedY = Math.max(0, Math.min(height, plotY));

      if (i === 0) {
        this.ctx.moveTo(i, clampedY);
      } else {
        this.ctx.lineTo(i, clampedY);
      }
    }
    this.ctx.stroke();

    // Draw cutoff frequency marker
    const cutoffX = (Math.log(this.cutoffFrequency / 20) / Math.log(nyquist / 20)) * width;
    this.ctx.strokeStyle = this.COLORS.cutoffMarker;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(cutoffX, 0);
    this.ctx.lineTo(cutoffX, height);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw labels
    this.ctx.fillStyle = this.COLORS.text;
    this.ctx.font = '10px monospace';
    this.ctx.fillText('Filter Response', this.PADDING, this.PADDING + 10);
    this.ctx.fillText('20Hz', this.PADDING, height - this.PADDING);
    this.ctx.fillText(`${Math.round(this.cutoffFrequency)}Hz`, cutoffX + 5, this.PADDING + 10);
    this.ctx.fillText(`${Math.round(nyquist)}Hz`, width - 60, height - this.PADDING);

    this.ctx.restore();
  }

  /**
   * Draw waveform oscilloscope
   */
  private drawWaveform(x: number, y: number, width: number, height: number): void {
    if (!this.analyserNode) return;

    this.ctx.save();
    this.ctx.translate(x, y);

    // Get time domain data
    const bufferLength = this.analyserNode.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteTimeDomainData(dataArray);

    // Draw center line
    this.ctx.strokeStyle = this.COLORS.grid;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, height / 2);
    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();

    // Draw waveform
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = this.COLORS.waveform;
    this.ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let plotX = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const plotY = (v * height) / 2;

      if (i === 0) {
        this.ctx.moveTo(plotX, plotY);
      } else {
        this.ctx.lineTo(plotX, plotY);
      }

      plotX += sliceWidth;
    }

    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();

    // Draw label
    this.ctx.fillStyle = this.COLORS.text;
    this.ctx.font = '10px monospace';
    this.ctx.fillText('Waveform', this.PADDING, this.PADDING + 10);

    this.ctx.restore();
  }

  /**
   * Draw grid helper
   */
  private drawGrid(width: number, height: number, divisions: number): void {
    this.ctx.strokeStyle = this.COLORS.grid;
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= divisions; i++) {
      const gridY = (height / divisions) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(0, gridY);
      this.ctx.lineTo(width, gridY);
      this.ctx.stroke();
    }
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.stop();
  }
}
