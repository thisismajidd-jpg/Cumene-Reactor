import React, { useEffect, useRef } from 'react';
import katex from 'katex';

/**
 * KaTeX wrapper. Use either:
 *   <Equation latex="r = k C_A C_B" />            inline
 *   <Equation latex="..." display />              block
 *
 * Falls back to the raw source on parse error rather than crashing.
 */
export default function Equation({ latex, display = false, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(latex, ref.current, {
        displayMode: display,
        throwOnError: false,
        output: 'html',
        strict: 'ignore',
      });
    } catch (err) {
      ref.current.textContent = latex;
    }
  }, [latex, display]);

  return (
    <span
      ref={ref}
      className={[display ? 'block my-2 overflow-x-auto' : 'inline', className].join(' ')}
    />
  );
}
