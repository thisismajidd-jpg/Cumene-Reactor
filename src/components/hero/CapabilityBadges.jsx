import React from 'react';
import Badge from '../ui/Badge.jsx';

const ITEMS = [
  { tone: 'cyan', label: 'PFR' },
  { tone: 'cyan', label: 'CSTR' },
  { tone: 'cyan', label: 'PBR' },
  { tone: 'teal', label: 'Non-isothermal' },
  { tone: 'teal', label: 'Heat transfer' },
  { tone: 'teal', label: 'Multi-reaction' },
  { tone: 'success', label: 'Sensitivity' },
  { tone: 'success', label: 'Optimization' },
];

export default function CapabilityBadges({ className = '' }) {
  return (
    <div className={['flex flex-wrap gap-2', className].join(' ')}>
      {ITEMS.map((item) => (
        <Badge key={item.label} tone={item.tone}>
          {item.label}
        </Badge>
      ))}
    </div>
  );
}
