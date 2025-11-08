/**
 * CollapsiblePanel - Reusable collapsible container for panels
 */

import { useState, ReactNode } from 'react';

interface CollapsiblePanelProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsiblePanel({ 
  title, 
  children, 
  defaultOpen = true,
  className = '' 
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`collapsible-panel ${className}`}>
      <div 
        className="panel-header" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3>{title}</h3>
        <span className={`collapse-icon ${isOpen ? '' : 'collapsed'}`}>▼</span>
      </div>
      <div className={`panel-content ${isOpen ? '' : 'collapsed'}`}>
        {children}
      </div>
    </div>
  );
}
