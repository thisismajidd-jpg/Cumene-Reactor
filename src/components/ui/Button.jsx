import React from 'react';

const variants = {
  primary:
    'bg-accent-cyan text-bg-base hover:bg-accent-cyan/90 active:bg-accent-cyan/80 shadow-[0_0_24px_-6px_rgba(34,211,238,0.7)] hover:shadow-[0_0_32px_-4px_rgba(34,211,238,0.85)]',
  secondary:
    'bg-bg-elevated text-text-primary border border-border hover:border-accent-cyan/50 hover:bg-bg-surface',
  ghost:
    'bg-transparent text-text-primary hover:bg-bg-surface',
  danger:
    'bg-state-danger text-white hover:bg-state-danger/90',
  outline:
    'bg-transparent text-accent-cyan border border-accent-cyan/40 hover:border-accent-cyan hover:bg-accent-cyan/10',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  leadingIcon,
  trailingIcon,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md font-medium',
        'transition-all duration-200 ease-smooth focus-ring',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
