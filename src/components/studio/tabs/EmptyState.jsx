import React from 'react';

export default function EmptyState({ title, description, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-bg-elevated border border-border grid place-items-center text-text-muted mb-3">
        {icon ?? '∿'}
      </div>
      <p className="font-display font-semibold text-text-primary">{title}</p>
      {description && (
        <p className="text-sm text-text-muted max-w-sm mt-1">{description}</p>
      )}
    </div>
  );
}
