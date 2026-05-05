import React from 'react';
import InputPanel from './InputPanel.jsx';
import { useAutoSolve } from '../../hooks/useSolver.js';
import Card from '../ui/Card.jsx';
import { useReactor } from '../../hooks/useReactor.js';

/**
 * Two-panel layout: inputs on the left, outputs on the right.
 *
 * The OutputPanel arrives in commit 8; this commit shows a placeholder card
 * that displays the raw solver result so the wiring can be verified.
 */
export default function DesignStudio() {
  const { state } = useReactor();
  const { runNow } = useAutoSolve();
  const result = state.solver.result;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-4">
        <InputPanel onSolve={runNow} />
      </div>
      <div className="lg:col-span-7 space-y-4">
        <Card title="Live output" subtitle="Output tabs land in commit 8.">
          {!result ? (
            <p className="text-sm text-text-muted">
              Adjust inputs on the left — the solver auto-runs after a brief idle. Or
              click <strong>Solve reactor</strong> to force a synchronous run.
            </p>
          ) : !result.ok ? (
            <p className="text-sm text-state-danger">
              Solver error: {result.message}
            </p>
          ) : result.reactorType === 'CSTR' ? (
            <pre className="text-xs num text-text-muted overflow-auto max-h-96">
              {JSON.stringify(
                {
                  reactorType: result.reactorType,
                  message: result.message,
                  solutions: result.cstr?.solutions?.map((s) => ({
                    X: s.X,
                    flows: s.flows,
                    epsilon: s.epsilon,
                  })),
                },
                null,
                2
              )}
            </pre>
          ) : (
            <pre className="text-xs num text-text-muted overflow-auto max-h-96">
              {JSON.stringify(
                {
                  reactorType: result.reactorType,
                  basis: result.basis,
                  summary: result.trajectory?.summary,
                  warnings: result.warnings,
                },
                null,
                2
              )}
            </pre>
          )}
        </Card>
      </div>
    </div>
  );
}
