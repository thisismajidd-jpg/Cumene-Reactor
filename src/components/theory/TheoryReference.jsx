import React from 'react';
import { EQUATIONS } from './equations.js';
import EquationCard from './EquationCard.jsx';

export default function TheoryReference() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {EQUATIONS.map((eq) => (
        <EquationCard key={eq.id} eq={eq} />
      ))}
    </div>
  );
}
