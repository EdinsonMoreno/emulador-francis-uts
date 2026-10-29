// Medidor de valor (gauge) con indicador de estado
import type { ReactNode } from 'react';

export type GaugeStatus = 'ok' | 'warn' | 'crit' | 'info';

export interface GaugeProps {
  value: number;
  label?: string;
  unit?: string;
  min?: number;
  max?: number;
  status?: GaugeStatus;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Gauge({
  value,
  label,
  unit,
  min = 0,
  max = 100,
  status = 'ok',
  children,
  size = 'md',
}: GaugeProps) {
  const sizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };
  const colors = {
    ok: 'text-success',
    warn: 'text-warning',
    crit: 'text-danger',
    info: 'text-accent-blue',
  };

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className={`gauge ${size === 'lg' ? 'text-lg' : ''}`}>
      <div style={{ width: size === 'lg' ? '200px' : size === 'sm' ? '100px' : '150px' }}>
        <div className="relative h-2 w-full rounded-full bg-bg-elev overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-200"
            style={{
              width: `${pct}%`,
              background: status === 'ok' ? 'var(--success)' : status === 'warn' ? 'var(--warning)' : status === 'crit' ? 'var(--danger)' : 'var(--accent-blue)',
            }}
          />
        </div>
      </div>
      <div>
        <span className={`gauge-value ${colors[status]}`}>
          {value.toFixed(2)}
          {unit ? ` ${unit}` : ''}
        </span>
        {label && <span className="gauge-label">{label}</span>}
      </div>
      {children}
    </div>
  );
}
