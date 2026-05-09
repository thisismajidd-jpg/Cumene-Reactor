import React from 'react';
import Button from '../ui/Button.jsx';
import Spinner from '../ui/Spinner.jsx';
import { useReactor } from '../../hooks/useReactor.js';

/**
 * Replaces the old "Solve Reactor" CTA. The studio auto-solves on every input
 * change (debounced ~80 ms via useAutoSolve), so an explicit solve button was
 * redundant. This bar instead shows the solver's live status and a Reset
 * action — the only manual action that's actually useful here.
 */
export default function SolverStatusBar() {
  const { state, reset } = useReactor();
  const status = state.solver.status;
  const result = state.solver.result;

  const pill = ((s) => {
    if (s === 'running') {
      return (
        <span className="inline-flex items-center gap-2 text-xs text-accent-cyan">
          <Spinner size={14} />
          Solving…
        </span>
      );
    }
    if (s === 'error') {
      return (
        <span className="inline-flex items-center gap-2 text-xs text-state-danger">
          <span className="w-2 h-2 rounded-full bg-state-danger shadow-[0_0_8px_rgba(239,68,68,0.7)]" aria-hidden />
          Solver error
        </span>
      );
    }
    if (s === 'success') {
      return (
        <span className="inline-flex items-center gap-2 text-xs text-state-success">
          <span className="w-2 h-2 rounded-full bg-state-success shadow-[0_0_8px_rgba(16,185,129,0.7)]" aria-hidden />
          Solved · {result?.reactorType ?? '—'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2 text-xs text-text-muted">
        <span className="w-2 h-2 rounded-full bg-text-muted/60" aria-hidden />
        Idle
      </span>
    );
  })(status);

  return (
    <div className="surface px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {pill}
          <span className="text-xs text-text-subtle">·</span>
          <span className="text-xs text-text-muted">
            Inputs auto-solve as you type — no button needed.
          </span>
        </div>
        {status === 'error' && result?.message && (
          <div
            className="text-xs text-state-danger num truncate mt-0.5"
            title={result.message}
          >
            {result.message}
          </div>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => reset()}
        title="Restore all inputs to their default values"
      >
        ↺ Reset
      </Button>
    </div>
  );
}
