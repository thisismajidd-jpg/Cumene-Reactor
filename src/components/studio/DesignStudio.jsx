import React from 'react';
import InputPanel from './InputPanel.jsx';
import OutputPanel from './OutputPanel.jsx';
import { useAutoSolve } from '../../hooks/useSolver.js';

export default function DesignStudio() {
  // Subscribe to the auto-solver: every state change debounces and re-solves.
  // No CTA needed — the result panel and live monitor reflect changes directly.
  useAutoSolve();
  return (
    // items-start prevents the grid from stretching the (shorter) output column
    // to match the (taller) input column. The output then sticks to the
    // viewport top while the user scrolls through input steps.
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-5 space-y-4">
        <InputPanel />
      </div>
      <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-20">
        <OutputPanel />
      </div>
    </div>
  );
}
