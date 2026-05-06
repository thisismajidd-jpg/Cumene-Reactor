import React from 'react';

/**
 * App-level safety net. If any descendant throws during render, we surface a
 * dark-mode-friendly fallback instead of a blank screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined') {
      console.error('[ReactorIQ] render error', error, info);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-bg-base text-text-primary grid place-items-center p-6">
        <div className="surface max-w-lg p-6">
          <p className="field-label text-state-danger mb-2">Something went wrong</p>
          <h2 className="font-display text-xl font-bold mb-2">A render error stopped the page.</h2>
          <p className="text-sm text-text-muted mb-3">
            This is usually caused by an invalid input value. Reload to restart with the
            default state — your inputs are not persisted between sessions.
          </p>
          <pre className="text-xs num text-text-muted bg-bg-elevated border border-border rounded-md p-3 overflow-auto max-h-48">
            {String(this.state.error?.message ?? this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center justify-center h-10 px-4 rounded-md bg-accent-cyan text-bg-base font-medium focus-ring"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
