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
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-px bg-accent-cyan" aria-hidden />
                <p className="field-label text-accent-cyan tracking-[0.18em]">
                  {eyebrow}
                </p>
              </div>
            )}
            {title && (
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-text-primary leading-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-3 max-w-2xl text-text-muted leading-relaxed">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </MotionFade>
      )}
      {children}
    </section>
  );
}
