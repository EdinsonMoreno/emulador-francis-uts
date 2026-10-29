// Indicador de estado (luz de color)
import type { ReactNode } from 'react';

export type StatusType = 'ok' | 'warn' | 'crit' | 'info';

export interface StatusLightProps {
  status: StatusType;
  label: string;
  children?: ReactNode;
  className?: string;
  showIcon?: boolean;
}

export function StatusLight({
  status,
  label,
  children,
  className,
  showIcon = true,
}: StatusLightProps) {
  const styles = {
    ok: 'bg-success/10 text-success border-success/15',
    warn: 'bg-warning/10 text-warning border-warning/15',
    crit: 'bg-danger/10 text-danger border-danger/15',
    info: 'bg-blue/10 text-blue border-blue/15',
  };

  return (
    <div
      className={`status-light ${styles[status]} ${className || ''}`}
      title={label}
    >
      {showIcon && (
        <span className="text-sm">
          {status === 'ok' ? '✓' : status === 'warn' ? '⚠' : status === 'crit' ? '✕' : 'i'}
        </span>
      )}
      <span>{label}</span>
      {children}
    </div>
  );
}
