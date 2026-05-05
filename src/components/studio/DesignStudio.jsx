import React from 'react';
import InputPanel from './InputPanel.jsx';
import OutputPanel from './OutputPanel.jsx';
import { useAutoSolve } from '../../hooks/useSolver.js';

export default function DesignStudio() {
  const { runNow } = useAutoSolve();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-4">
        <InputPanel onSolve={runNow} />
      </div>
      <div className="lg:col-span-7 space-y-4">
        <OutputPanel />
      </div>
    </div>
  );
}
