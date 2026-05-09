import { useEffect, useState } from 'react';

/**
 * Returns a [0, 1] value that maps the user's scroll *within the hero
 * section only*: 0 when the hero top is at the viewport top, 1 when the
 * hero's bottom has scrolled past the viewport top. Used to drive the
 * hero's "exit choreography" — title falls, energy core dismisses.
 *
 * Independent of total page scroll progress so the choreography always
 * happens in roughly the first viewport-full of scrolling.
 */
export function useHeroProgress(elementId) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const compute = () => {
      frame = 0;
      const el = document.getElementById(elementId);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = Math.max(1, rect.height);
      const scrolled = -rect.top;
      setProgress(Math.max(0, Math.min(1, scrolled / total)));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [elementId]);

  return progress;
}
