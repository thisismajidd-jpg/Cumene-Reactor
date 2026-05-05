import { useEffect, useState } from 'react';

/**
 * Returns a debounced view of `value` that only updates after `delay` ms of stillness.
 * Useful for binding sensitivity sliders to the solver without thrashing on every tick.
 */
export function useDebouncedValue(value, delay = 220) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
