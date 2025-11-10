import React, { useRef, useEffect } from 'react';
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
  const okButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management and keyboard handling
  useEffect(() => {
    if (!open) return;

    // Focus the OK button when dialog opens
    okButtonRef.current?.focus();

    // Handle Escape key to close dialog
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Trap focus within dialog
    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        // Since we only have one focusable element (OK button),
        // prevent tabbing away from it
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleFocusTrap);

    // Prevent body scroll when dialog is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleFocusTrap);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Close dialog if clicking outside the box
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="synth-init-backdrop"
      ref={dialogRef}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="synth-init-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="synth-init-title"
        aria-describedby="synth-init-desc"
      >
        <h2 id="synth-init-title" className="synth-init-title">
          {title}
        </h2>
        <p id="synth-init-desc" className="synth-init-desc">
          {description}
        </p>
        <button
          ref={okButtonRef}
          className="synth-init-ok"
          onClick={onClose}
          aria-label="Close dialog and initialize synthesizer"
        >
          OK
        </button>
      </div>
    </div>
  );
};
