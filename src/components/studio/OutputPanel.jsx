import React, { useMemo, useState } from 'react';
import Card from '../ui/Card.jsx';
import { Tabs } from '../ui/Tabs.jsx';
import Spinner from '../ui/Spinner.jsx';
import ConversionTab from './tabs/ConversionTab.jsx';
import TemperatureTab from './tabs/TemperatureTab.jsx';
import ConcentrationTab from './tabs/ConcentrationTab.jsx';
import SelectivityTab from './tabs/SelectivityTab.jsx';
import SummaryTab from './tabs/SummaryTab.jsx';
import { useReactor } from '../../hooks/useReactor.js';

const TABS = [
  { id: 'X', label: 'Conversion', component: ConversionTab },
  { id: 'T', label: 'Temperature', component: TemperatureTab },
  { id: 'C', label: 'Concentrations', component: ConcentrationTab },
  { id: 'SY', label: 'Selectivity & Yield', component: SelectivityTab },
  { id: 'S', label: 'Summary', component: SummaryTab },
];

export default function OutputPanel() {
  const { state } = useReactor();
  const [tab, setTab] = useState('X');
  const result = state.solver.result;
  const status = state.solver.status;

  const tabs = useMemo(() => {
    return TABS.map((t) => {
      const disabled =
        (t.id === 'T' && state.reactor.isothermal) ||
        (t.id === 'SY' && !state.reaction.sideReactionEnabled) ||
        (result?.reactorType === 'CSTR' && t.id !== 'S');
      return { id: t.id, label: t.label, disabled };
    });
  }, [state.reactor.isothermal, state.reaction.sideReactionEnabled, result?.reactorType]);

  const Active = TABS.find((t) => t.id === tab)?.component ?? ConversionTab;

  return (
    <Card
      title="Live output"
      subtitle="Plots refresh as you adjust inputs."
      action={
        status === 'running' ? (
          <span className="inline-flex items-center gap-2 text-xs text-text-muted">
            <Spinner size={14} />
            Solving…
          </span>
        ) : status === 'error' && result ? (
          <span className="text-xs text-state-danger">Solver error</span>
        ) : null
      }
    >
      <Tabs value={tab} onChange={setTab} tabs={tabs} className="mb-4" />
      <div role="tabpanel">
        <Active result={result} />
      </div>
    </Card>
  );
}
