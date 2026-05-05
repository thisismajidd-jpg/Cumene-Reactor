import React, { useEffect, useRef, useState } from 'react';

/**
 * Reveals its children with a fade+rise on first scroll into view.
 * Pure CSS animation — no Framer Motion. Respects prefers-reduced-motion.
 */
export default function MotionFade({
  as: As = 'div',
  delay = 0,
  className = '',
  children,
  ...rest
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible || !ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <As
      ref={ref}
      style={{ animationDelay: `${delay}ms` }}
      className={[
        visible ? 'animate-fade-in' : 'opacity-0',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </As>
  );
}
