import React from 'react';
import Button from '../ui/Button.jsx';
import Spinner from '../ui/Spinner.jsx';
import { useReactor } from '../../hooks/useReactor.js';

/**
 * Big primary CTA for the studio. Auto-solve runs whenever inputs change, but
 * this button gives the user a deliberate "solve now" feedback affordance.
 */
export default function SolveButton({ onSolve }) {
  const { state } = useReactor();
  const status = state.solver.status;
  const running = status === 'running';

  return (
    <Button
      size="lg"
      onClick={onSolve}
      disabled={running}
      leadingIcon={running ? <Spinner size={16} /> : null}
      className="w-full"
    >
      {running ? 'Solving…' : 'Solve reactor'}
    </Button>
  );
}
