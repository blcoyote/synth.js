/**
 * CollapsiblePanel - Reusable collapsible container for panels
 */

import { useState, ReactNode, useEffect, useCallback } from 'react';

interface CollapsiblePanelProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean; // Controlled mode
  className?: string;
  showLed?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export function CollapsiblePanel({ 
  title, 
  children, 
  defaultOpen = true,
  isOpen: controlledIsOpen,
  className = '',
  showLed = false,
  onToggle
}: CollapsiblePanelProps) {
  // Use controlled prop if provided, otherwise use internal state
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleToggle = useCallback(() => {
    const newState = !isOpen;
    if (!isControlled) {
      setInternalIsOpen(newState);
    }
    onToggle?.(newState);
  }, [isOpen, isControlled, onToggle]);

  // Notify parent of initial state (only in uncontrolled mode)
  useEffect(() => {
    if (onToggle && !isControlled) {
      onToggle(defaultOpen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`collapsible-panel ${className}`}>
      <div 
        className="panel-header" 
        onClick={handleToggle}
      >
        <div className="panel-title-row">
          {showLed && <span className={`led-indicator ${isOpen ? 'active' : 'inactive'}`} />}
          <h3>{title}</h3>
        </div>
        <span className={`collapse-icon ${isOpen ? '' : 'collapsed'}`}>▼</span>
      </div>
      <div className={`panel-content ${isOpen ? '' : 'collapsed'}`}>
        {children}
      </div>
    </div>
  );
}
