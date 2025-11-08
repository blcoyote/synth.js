/**
 * CollapsiblePanel - Reusable collapsible container for panels
 */

import { useState, ReactNode, useEffect } from 'react';

interface CollapsiblePanelProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  showLed?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export function CollapsiblePanel({ 
  title, 
  children, 
  defaultOpen = true,
  className = '',
  showLed = false,
  onToggle
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  };

  // Notify parent of initial state
  useEffect(() => {
    if (onToggle) {
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
