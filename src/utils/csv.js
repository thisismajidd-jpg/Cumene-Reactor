// CSV export helper.
// Produces a Blob, then triggers a download.  No external lib.

export function buildCSV(rows, columns) {
  const header = columns.map(escapeCsv).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCsv(row[c] ?? '')).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

export function downloadCSV(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Convenience: build a "trajectory" CSV from a processed result.
 */
export function trajectoryToCSV(processed, basis = 'W') {
  const rows = [];
  const ts = processed.ts;
  const speciesKeys = Object.keys(processed.F);
  for (let i = 0; i < ts.length; i++) {
    const row = {
      [basis]: ts[i],
      T_K: processed.T[i],
      P_Pa: processed.P[i],
      X: processed.X[i],
      S: processed.S[i],
      Y: processed.Y[i],
    };
    for (const sp of speciesKeys) {
      row[`F_${sp}_mol_s`] = processed.F[sp][i];
      row[`C_${sp}_mol_m3`] = processed.C[sp][i];
    }
    rows.push(row);
  }
  const cols = [
    basis,
    'T_K',
    'P_Pa',
    'X',
    'S',
    'Y',
    ...speciesKeys.flatMap((sp) => [`F_${sp}_mol_s`, `C_${sp}_mol_m3`]),
  ];
  return buildCSV(rows, cols);
}
