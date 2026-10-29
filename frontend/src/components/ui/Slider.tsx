// Deslizador (slider) con etiqueta y valor
import type { ChangeEvent } from 'react';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  className?: string;
}

export function Slider({ label, value, min, max, step = 1, unit, onChange, className }: SliderProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    onChange(v);
  };

  return (
    <div className={`parameter-slider ${className || ''}`}>
      <div className="slider-group">
        <label className="slider-label">
          <span>{label}</span>
          <span className="slider-value">
            {value.toFixed(2)}
            {unit ? ` ${unit}` : ''}
          </span>
        </label>
        <input
          type="range"
          className="slider-input"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
