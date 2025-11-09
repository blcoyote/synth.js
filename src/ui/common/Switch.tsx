/**
 * Switch - Toggle switch component (replacement for checkboxes)
 */

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  labelPosition?: 'left' | 'right';
}

export function Switch({ checked, onChange, disabled = false, label, labelPosition = 'right' }: SwitchProps) {
  return (
    <label className={`switch-container ${disabled ? 'disabled' : ''}`}>
      {label && labelPosition === 'left' && <span className="switch-label">{label}</span>}
      <div className="switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="switch-slider"></span>
      </div>
      {label && labelPosition === 'right' && <span className="switch-label">{label}</span>}
    </label>
  );
}
