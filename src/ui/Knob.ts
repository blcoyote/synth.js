/**
 * Rotary Knob Component
 * Hardware-style rotary knob with mouse drag interaction
 */

export interface KnobOptions {
  min: number;
  max: number;
  value: number;
  step?: number;
  label?: string;
  unit?: string;
  onChange?: (value: number) => void;
  valueFormatter?: (value: number) => string;
}

export class Knob {
  private container: HTMLDivElement;
  private knobElement: HTMLDivElement;
  private indicator: HTMLDivElement;
  private valueDisplay: HTMLDivElement;
  private labelElement?: HTMLDivElement;
  
  private options: Required<Omit<KnobOptions, 'valueFormatter'>> & { valueFormatter?: (value: number) => string };
  private currentValue: number;
  private isDragging = false;
  private startY = 0;
  private startValue = 0;

  // Rotation range: -135° to +135° (270° total)
  private readonly MIN_ANGLE = -135;
  private readonly MAX_ANGLE = 135;
  private readonly SENSITIVITY = 0.5; // Pixels per unit

  constructor(containerId: string, options: KnobOptions) {
    this.options = {
      step: 1,
      label: '',
      unit: '',
      onChange: () => {},
      ...options,
    };
    this.currentValue = options.value;

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id '${containerId}' not found`);
    }

    // Create knob structure
    this.container = document.createElement('div');
    this.container.className = 'knob-container';

    // Label
    if (this.options.label) {
      this.labelElement = document.createElement('div');
      this.labelElement.className = 'knob-label';
      this.labelElement.textContent = this.options.label;
      this.container.appendChild(this.labelElement);
    }

    // Knob element
    this.knobElement = document.createElement('div');
    this.knobElement.className = 'knob';

    // Indicator line
    this.indicator = document.createElement('div');
    this.indicator.className = 'knob-indicator';
    this.knobElement.appendChild(this.indicator);

    this.container.appendChild(this.knobElement);

    // Value display
    this.valueDisplay = document.createElement('div');
    this.valueDisplay.className = 'knob-value-display';
    this.container.appendChild(this.valueDisplay);

    // Add to DOM
    container.appendChild(this.container);

    // Setup interaction
    this.setupInteraction();
    
    // Initial render
    this.updateDisplay();
  }

  private setupInteraction(): void {
    this.knobElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));

    // Prevent text selection while dragging
    this.knobElement.addEventListener('selectstart', (e) => e.preventDefault());
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.startY = e.clientY;
    this.startValue = this.currentValue;
    this.knobElement.style.cursor = 'grabbing';
    e.preventDefault();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    // Calculate delta (inverted: drag up = increase value)
    const deltaY = this.startY - e.clientY;
    const range = this.options.max - this.options.min;
    const deltaValue = (deltaY * this.SENSITIVITY * range) / 100;

    // Calculate new value with step
    let newValue = this.startValue + deltaValue;
    
    // Apply step
    if (this.options.step) {
      newValue = Math.round(newValue / this.options.step) * this.options.step;
    }

    // Clamp to range
    newValue = Math.max(this.options.min, Math.min(this.options.max, newValue));

    if (newValue !== this.currentValue) {
      this.currentValue = newValue;
      this.updateDisplay();
      this.options.onChange(this.currentValue);
    }
  }

  private onMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.knobElement.style.cursor = 'pointer';
    }
  }

  private updateDisplay(): void {
    // Calculate rotation angle
    const percent = (this.currentValue - this.options.min) / (this.options.max - this.options.min);
    const angle = this.MIN_ANGLE + percent * (this.MAX_ANGLE - this.MIN_ANGLE);
    
    // Rotate indicator
    this.indicator.style.transform = `translateX(-50%) rotate(${angle}deg)`;

    // Update value display
    const displayValue = this.options.valueFormatter 
      ? this.options.valueFormatter(this.currentValue)
      : `${this.currentValue}${this.options.unit}`;
    this.valueDisplay.textContent = displayValue;
  }

  public setValue(value: number): void {
    this.currentValue = Math.max(this.options.min, Math.min(this.options.max, value));
    this.updateDisplay();
  }

  public getValue(): number {
    return this.currentValue;
  }

  public destroy(): void {
    this.container.remove();
  }
}
