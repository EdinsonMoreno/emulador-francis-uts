// Panel de información genérico
import type { ReactNode } from 'react';

export interface PanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function Panel({ title, subtitle, children, className, actions }: PanelProps) {
  return (
    <div className={`card ${className || ''}`}>
      <div className="card-header">
        <div className="card-title">{title}</div>
        {actions}
      </div>
      <div className="card-body">
        {subtitle && <p className="text-sm text-text-secondary mb-3">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
