// Indicador numérico en vivo (las variables cambian su valor con el tiempo)
import { useEffect, useState } from 'react';

export interface LiveValueProps {
  value: number;
  unit?: string;
  precision?: number;
  className?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'blue';
  min?: number;
  max?: number;
}

export function LiveValue({
  value,
  unit,
  precision = 2,
  className,
  color = 'primary',
  min,
  max,
}: LiveValueProps) {
  const colors = {
    primary: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    blue: 'text-accent-blue',
  };

  const formatted = value.toFixed(precision);

  return (
    <div className={`live-value ${className || ''}`}>
      <span className={`font-mono text-2xl font-bold ${colors[color]}`}>
        {formatted}
      </span>
      {unit && <span className="text-sm text-text-tertiary ml-2 font-mono">{unit}</span>}
    </div>
  );
}
