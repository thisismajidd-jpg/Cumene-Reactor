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
    <section className={[base, 'shadow-panel', className].join(' ')}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            {title && (
              <h3 className="font-display text-base font-semibold text-text-primary">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
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
