import { useEffect, useRef, useState } from 'react';

/**
 * Owns the parametric Web Worker lifecycle and exposes a promise-style
 * `runSweep(payload)` that resolves with the result grid.
 *
 * The worker is created lazily on first call and re-used until unmount.
 */
export function useParametricWorker() {
  const workerRef = useRef(null);
  const pendingRef = useRef(null);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    return () => {
      if (workerRef.current) workerRef.current.terminate();
      workerRef.current = null;
    };
  }, []);

  const ensureWorker = () => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/parametric.worker.js', import.meta.url),
        { type: 'module' }
      );
      workerRef.current.addEventListener('message', (e) => {
        const msg = e.data;
        if (msg.type === 'progress') {
          setProgress({ i: msg.i, total: msg.total });
        } else if (msg.type === 'done') {
          setProgress(null);
          pendingRef.current?.resolve(msg);
          pendingRef.current = null;
        } else if (msg.type === 'error') {
          setProgress(null);
          pendingRef.current?.reject(new Error(msg.message));
          pendingRef.current = null;
        }
      });
    }
    return workerRef.current;
  };

  const runSweep = (payload) => {
    return new Promise((resolve, reject) => {
      const w = ensureWorker();
      pendingRef.current = { resolve, reject };
      setProgress({ i: 0, total: payload.axes[0].n * payload.axes[1].n });
      w.postMessage({ type: 'sweep', ...payload });
    });
  };

  return { runSweep, progress };
}
