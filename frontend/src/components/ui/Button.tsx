// Botón genérico del diseño industrial
import type { ReactNode } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'amber' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: ReactNode;
  active?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  active = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'btn flex items-center justify-center gap-2 font-semibold transition-all duration-150';
  const variants = {
    primary: 'bg-accent-blue border-accent-blue text-bg-deep hover:bg-accent-blue/90',
    secondary:
      'bg-bg-elev border-border text-text-primary hover:bg-bg-elev-2',
    danger: 'bg-danger border-danger text-white hover:bg-danger/90',
    amber: 'bg-accent-amber border-accent-amber text-bg-deep hover:bg-amber/90',
    ghost: 'bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elev',
  };
  const sizes = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-3 text-sm',
    lg: 'px-5 py-4 text-base',
    icon: 'w-10 h-10 px-0',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${active ? 'ring-2 ring-accent-blue' : ''} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
