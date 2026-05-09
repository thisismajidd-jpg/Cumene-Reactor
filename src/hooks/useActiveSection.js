import { useEffect, useState } from 'react';

/**
 * Watches a list of section IDs with IntersectionObserver and reports which
 * one is currently most visible. Used by the 3D centerpiece to pick a pose,
 * and by the navbar to highlight the matching link.
 *
 * Returns the active section id (string) — null while none is in view.
 */
export function useActiveSection(ids, options = {}) {
  const [activeId, setActiveId] = useState(ids[0] ?? null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      {
        rootMargin: options.rootMargin ?? '-30% 0px -50% 0px',
        threshold: options.threshold ?? [0, 0.25, 0.5, 0.75, 1],
      },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ids, options.rootMargin, options.threshold]);

  return activeId;
}
