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
    <div className="space-y-6">
      {/* Live sensitivity — sliders left, sticky trajectory right (mirrors Studio). */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-4">
          <Card
            title="Live sensitivity"
            subtitle={
              hasResult
                ? 'Drag a slider — the chart on the right updates instantly.'
                : 'Drag a slider; results appear once the solver returns its first trajectory.'
            }
          >
            <SliderRack />
          </Card>
        </div>
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-20">
          <SensitivityMonitor />
        </div>
      </div>

      {/* Parametric + Optimizer below, two columns. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <ParametricStudy />
        </div>
        <div className="lg:col-span-5">
          <OptimizerPanel />
        </div>
      </div>
    </div>
  );
}
