import React from 'react';
import Card from '../ui/Card.jsx';
import SliderRack from './SliderRack.jsx';
import SensitivityMonitor from './SensitivityMonitor.jsx';
import ParametricStudy from './ParametricStudy.jsx';
import OptimizerPanel from './OptimizerPanel.jsx';
import { useReactor } from '../../hooks/useReactor.js';

export default function SensitivityPanel() {
  const { state } = useReactor();
  const hasResult = !!state.solver.result?.ok;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-12">
        <Card
          title="Live sensitivity"
          subtitle={
            hasResult
              ? 'Drag a slider — the chart on the right updates instantly.'
              : 'Drag a slider; results appear once the solver returns its first trajectory.'
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5">
              <SliderRack />
            </div>
            <div className="lg:col-span-7">
              <SensitivityMonitor />
            </div>
          </div>
        </Card>
      </div>
      <div className="lg:col-span-7">
        <ParametricStudy />
      </div>
      <div className="lg:col-span-5">
        <OptimizerPanel />
      </div>
    </div>
  );
}
