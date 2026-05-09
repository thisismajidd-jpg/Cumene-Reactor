import React from 'react';

export default function Card({
  title,
  subtitle,
  action,
  className = '',
  bodyClassName = '',
  children,
  variant = 'surface',
}) {
  const base = variant === 'panel' ? 'panel' : 'surface';
  return (
    <section
      className={[
        base,
        'shadow-panel transition-colors duration-200 hover:border-border-strong',
        className,
      ].join(' ')}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            {title && (
              <div className="flex items-center gap-2">
                <span
                  className="w-1 h-4 rounded-sm bg-gradient-to-b from-accent-cyan to-accent-teal"
                  aria-hidden
                />
                <h3 className="font-display text-base font-semibold text-text-primary truncate">
                  {title}
                </h3>
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-text-muted mt-1 leading-relaxed">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={['px-5 pb-5', title ? 'pt-0' : 'pt-5', bodyClassName].join(' ')}>
        {children}
      </div>
    </section>
  );
}
