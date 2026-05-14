import React from 'react';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import CaseExplainer from './CaseExplainer.jsx';

export default function CaseCard({ caseDef, onLoad, active }) {
  const reactorType = caseDef.state.reactor.type;
  const isothermal = caseDef.state.reactor.isothermal;
  const sideOn = (caseDef.state.reaction.sides ?? []).length > 0;
  const tone = active ? 'cyan' : 'default';

  return (
    <Card
      title={caseDef.title}
      subtitle={caseDef.subtitle}
      action={
        active ? (
          <Badge tone="cyan">Active</Badge>
        ) : null
      }
    >
      <p className="text-sm text-text-muted leading-relaxed">{caseDef.tagline}</p>

      <div className="flex flex-wrap gap-1.5 mt-3">
        <Badge tone={tone}>{reactorType}</Badge>
        <Badge tone={isothermal ? 'default' : 'teal'}>
          {isothermal ? 'Isothermal' : 'Non-isothermal'}
        </Badge>
        {sideOn && <Badge tone="warning">Multi-reaction</Badge>}
        {caseDef.state.reactor.pbr?.ergunEnabled && (
          <Badge tone="teal">Ergun</Badge>
        )}
      </div>

      <div className="mt-4 flex justify-between items-center">
        <Button variant="primary" size="sm" onClick={() => onLoad(caseDef)}>
          Load into Studio
        </Button>
      </div>

      <CaseExplainer items={caseDef.narrative} />
    </Card>
  );
}
