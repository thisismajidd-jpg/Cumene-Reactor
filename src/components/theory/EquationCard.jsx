import React from 'react';
import Card from '../ui/Card.jsx';
import Equation from '../ui/Equation.jsx';

export default function EquationCard({ eq }) {
  return (
    <Card title={eq.title} subtitle={eq.blurb}>
      <div className="rounded-md border border-border bg-bg-elevated px-4 py-3">
        <Equation latex={eq.latex} display />
      </div>
      {eq.legend?.length > 0 && (
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {eq.legend.map(([sym, meaning], i) => (
            <div key={i} className="flex items-baseline gap-2">
              <dt
                className="num text-text-primary"
                dangerouslySetInnerHTML={{ __html: sym }}
              />
              <dd className="text-text-muted">{meaning}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
