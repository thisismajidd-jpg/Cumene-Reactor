import React from 'react';

const tones = {
  default:
    'bg-bg-elevated text-text-muted border border-border',
  cyan:
    'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30',
  teal:
    'bg-accent-teal/10 text-accent-teal border border-accent-teal/30',
  warning:
    'bg-state-warning/10 text-state-warning border border-state-warning/30',
  danger:
    'bg-state-danger/10 text-state-danger border border-state-danger/30',
  success:
    'bg-state-success/10 text-state-success border border-state-success/30',
};

export default function Badge({ tone = 'default', children, className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 h-6 rounded-full text-xs font-medium',
        tones[tone],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
