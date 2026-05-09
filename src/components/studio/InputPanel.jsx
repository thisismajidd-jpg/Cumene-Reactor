import React from 'react';
import ReactionSetupStep from './steps/ReactionSetupStep.jsx';
import OperatingConditionsStep from './steps/OperatingConditionsStep.jsx';
import ReactorConfigStep from './steps/ReactorConfigStep.jsx';
import ConstraintsStep from './steps/ConstraintsStep.jsx';
import SolverStatusBar from './SolverStatusBar.jsx';

export default function InputPanel() {
  return (
    <div className="space-y-4">
      <ReactionSetupStep index={1} />
      <OperatingConditionsStep index={2} />
      <ReactorConfigStep index={3} />
      <ConstraintsStep index={4} />
      <div className="pt-1">
        <SolverStatusBar />
      </div>
    </div>
  );
}
