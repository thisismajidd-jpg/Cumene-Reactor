import React, { useEffect, useState } from 'react';
import Input from './Input.jsx';
import { parseNumber } from '../../utils/format.js';

/**
 * Numeric input that:
 *   - accepts scientific notation ("2.8e4") and thousands separators
 *   - holds an internal text buffer so the user can type freely
 *   - emits onValue(number | null) on blur or valid intermediate input
 */
export default function NumberInput({
  value,
  onValue,
  precision = 6,
  min,
  max,
  ...inputProps
}) {
  const [text, setText] = useState(() => formatInitial(value, precision));
  const [error, setError] = useState(null);

  useEffect(() => {
    setText(formatInitial(value, precision));
  }, [value, precision]);

  const handleChange = (e) => {
    const raw = e.target.value;
    setText(raw);
    const parsed = parseNumber(raw);
    if (parsed == null) {
      setError(null);              // don't error mid-typing ("-", "1e", "")
      return;
    }
    if (min != null && parsed < min) return setError(`Min ${min}`);
    if (max != null && parsed > max) return setError(`Max ${max}`);
    setError(null);
    onValue?.(parsed);
  };

  const handleBlur = () => {
    const parsed = parseNumber(text);
    if (parsed == null && text !== '') {
      setError('Not a number');
      return;
    }
    if (parsed == null && text === '' && inputProps.nullable !== false) {
      onValue?.(null);
      return;
    }
    if (parsed != null) {
      setText(formatInitial(parsed, precision));
      onValue?.(parsed);
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      error={error || inputProps.error}
      {...inputProps}
    />
  );
}

function formatInitial(v, precision) {
  if (v == null || !Number.isFinite(v)) return '';
  const p = Number.isFinite(precision) ? Math.min(100, Math.max(1, Math.round(precision))) : 6;
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) {
    return v.toExponential(Math.max(0, p - 1));
  }
  return String(+v.toPrecision(p));
}
