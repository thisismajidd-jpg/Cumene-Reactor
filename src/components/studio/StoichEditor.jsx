import React, { useEffect, useState } from 'react';
import NumberInput from '../ui/NumberInput.jsx';

/**
 * Edit stoichiometric coefficients for one reaction.
 *
 *   ν < 0 reactant, ν > 0 product, ν = 0 spectator.
 *
 * Two synchronized editors:
 *   1. **Equation field** — type/edit "A + B → C" (also accepts "->" or "=").
 *      Optional integer/decimal coefficients: "2A + 3B -> C + 0.5D".
 *   2. **Per-species ν grid** — fine numerical control. Both editors update the
 *      same `rxn.stoich` so they stay in lockstep.
 */
export default function StoichEditor({ rxn, species, update }) {
  const setNu = (id, nu) => {
    const next = { ...rxn.stoich, [id]: nu };
    if (nu === 0) delete next[id];
    update({ stoich: next });
  };

  const rendered = renderEquation(rxn.stoich, species);
  const [text, setText] = useState(rendered);
  const [error, setError] = useState(null);

  // Keep the field in sync if stoich changes from another input (e.g. ν grid).
  useEffect(() => {
    setText(renderEquation(rxn.stoich, species));
    setError(null);
  }, [rxn.stoich, species]);

  const commit = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError('Empty equation');
      return;
    }
    const parsed = parseEquation(trimmed);
    if (!parsed) {
      setError('Could not parse — use "A + B → C" or "2A + B -> C + D"');
      return;
    }
    const knownIds = new Set(species.map((s) => s.id));
    const unknown = Object.keys(parsed).filter((id) => !knownIds.has(id));
    if (unknown.length) {
      setError(`Unknown species: ${unknown.join(', ')}. Add it in the Species editor.`);
      return;
    }
    setError(null);
    update({ stoich: parsed });
  };

  return (
    <div className="space-y-3">
      <div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(e.currentTarget.value);
            }
          }}
          placeholder='Type the equation, e.g. "A + B → C"'
          spellCheck={false}
          aria-label="Reaction equation"
          className={[
            'w-full rounded-md border bg-bg-elevated px-4 h-11 num text-sm text-accent-cyan',
            'focus:outline-none focus:shadow-glow transition-colors',
            error ? 'border-state-danger/60 focus:border-state-danger'
                  : 'border-border focus:border-accent-cyan',
          ].join(' ')}
        />
        {error ? (
          <p className="text-xs text-state-danger mt-1.5">{error}</p>
        ) : (
          <p className="text-xs text-text-muted mt-1.5">
            Tip: use <span className="num">→</span>, <span className="num">-&gt;</span>, or{' '}
            <span className="num">=</span> as the arrow. Coefficients optional.
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {species.map((sp) => (
          <NumberInput
            key={sp.id}
            label={`ν (${sp.id})`}
            value={rxn.stoich[sp.id] ?? 0}
            onValue={(v) => setNu(sp.id, v)}
            precision={3}
            unit="—"
            hint={
              (rxn.stoich[sp.id] ?? 0) < 0
                ? 'reactant'
                : (rxn.stoich[sp.id] ?? 0) > 0
                ? 'product'
                : 'spectator'
            }
          />
        ))}
      </div>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────

function renderEquation(stoich, species) {
  const fmtTerm = (id, coef) =>
    `${Math.abs(coef) === 1 ? '' : Math.abs(coef)}${id}`;
  const lhs = species
    .filter((s) => (stoich[s.id] ?? 0) < 0)
    .map((s) => fmtTerm(s.id, stoich[s.id]))
    .join(' + ');
  const rhs = species
    .filter((s) => (stoich[s.id] ?? 0) > 0)
    .map((s) => fmtTerm(s.id, stoich[s.id]))
    .join(' + ');
  return `${lhs || '—'} → ${rhs || '—'}`;
}

/**
 * Parse "A + B → C", "2A + 3B -> C + 0.5D", "X = Y + 2Z", etc.
 * Returns a stoich map { id: nu } or null on parse failure.
 */
export function parseEquation(input) {
  const norm = input
    .replace(/\s+/g, '')
    .replace(/→/g, '->')
    .replace(/⇌|⇄|↔|<=>|<->/g, '->')
    .replace(/=(?!>)/g, '->');
  const parts = norm.split('->');
  if (parts.length !== 2) return null;
  const [lhs, rhs] = parts;
  const out = {};
  if (!parseSide(lhs, -1, out)) return null;
  if (!parseSide(rhs, +1, out)) return null;
  if (Object.keys(out).length === 0) return null;
  return out;
}

function parseSide(side, sign, acc) {
  if (!side) return false;
  // Skip placeholder dashes from the rendered template.
  if (side === '—' || side === '-') return true;
  const terms = side.split('+');
  for (const t of terms) {
    if (!t) return false;
    const m = t.match(/^(\d*\.?\d*)([A-Za-z][A-Za-z0-9_]*)$/);
    if (!m) return false;
    const coefRaw = m[1];
    const sp = m[2];
    const coef = coefRaw === '' || coefRaw === '.' ? 1 : parseFloat(coefRaw);
    if (!Number.isFinite(coef)) return false;
    acc[sp] = (acc[sp] ?? 0) + sign * coef;
  }
  return true;
}
