import React, { useRef } from 'react';
import './SynthInitDialog.css';

interface SynthInitDialogProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
}

export const SynthInitDialog: React.FC<SynthInitDialogProps> = ({
  open,
  title,
  description,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close dialog if clicking outside the box
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="synth-init-backdrop" ref={dialogRef} onClick={handleBackdropClick}>
      <div className="synth-init-dialog">
        <h2 className="synth-init-title">{title}</h2>
        <p className="synth-init-desc">{description}</p>
        <button className="synth-init-ok" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
};
