import React from 'react';
import MotionFade from '../ui/MotionFade.jsx';

export default function SectionShell({
  id,
  eyebrow,
  title,
  description,
  action,
  children,
  className = '',
}) {
  return (
    <section
      id={id}
      className={[
        'mx-auto max-w-7xl px-6 sm:px-8 py-16 md:py-20 scroll-mt-20',
        className,
      ].join(' ')}
    >
      {(eyebrow || title || description || action) && (
        <MotionFade className="mb-8 md:mb-10 flex items-end justify-between gap-6 flex-wrap">
          <div>
            {eyebrow && (
              <p className="field-label text-accent-cyan mb-2">{eyebrow}</p>
            )}
            {title && (
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-2 max-w-2xl text-text-muted">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </MotionFade>
      )}
      {children}
    </section>
  );
}
