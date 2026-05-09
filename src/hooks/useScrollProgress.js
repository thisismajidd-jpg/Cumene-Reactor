import { useEffect, useState } from 'react';

/**
 * Returns a [0, 1] page-scroll progress value, throttled to rAF. Used as a
 * stable continuous driver for 3D animations that should evolve smoothly
 * across the entire page (independent of which section is "active").
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      frame = 0;
      const max = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      setProgress(Math.max(0, Math.min(1, window.scrollY / max)));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return progress;
}
