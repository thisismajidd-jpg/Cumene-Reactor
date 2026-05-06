import React, { useEffect, useState } from 'react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 800);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;
  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-cyan/15 border border-accent-cyan/40 text-accent-cyan backdrop-blur-md hover:bg-accent-cyan/25 focus-ring shadow-glow"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
        <path
          d="M8 12V4M4 8l4-4 4 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
