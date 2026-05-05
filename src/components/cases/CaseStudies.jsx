import React from 'react';
import CaseCard from './CaseCard.jsx';
import BifurcationDiagram from './BifurcationDiagram.jsx';
import { CASES } from '../../cases/index.js';
import { useReactor } from '../../hooks/useReactor.js';
import { SECTION_IDS } from '../../utils/constants.js';

export default function CaseStudies() {
  const { state, loadCase } = useReactor();

  const onLoad = (caseDef) => {
    loadCase(caseDef.id, caseDef.state);
    // After loading, scroll to the studio so the user can see the result.
    setTimeout(() => {
      document
        .getElementById(SECTION_IDS.studio)
        ?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {CASES.map((c) => (
          <CaseCard
            key={c.id}
            caseDef={c}
            onLoad={onLoad}
            active={state.activeCaseId === c.id}
          />
        ))}
      </div>
      <BifurcationDiagram />
    </div>
  );
}
