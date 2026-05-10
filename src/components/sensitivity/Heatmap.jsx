import React, { useMemo, useState } from 'react';
import { fmtCompact } from '../../utils/format.js';

/**
 * Custom SVG heatmap (~120 LOC, no extra library).
 *
 * Props:
 *   grid:  number[][]                 (rows = y axis, cols = x axis)
 *   xs:    number[]                   x-axis tick values (length = grid[0].length)
 *   ys:    number[]                   y-axis tick values (length = grid.length)
 *   xLabel, yLabel
 *   metricLabel                       legend caption
 *   colorScheme: 'viridis' | 'rdylgn' | 'cyan'
 *   highlight: { i, j } | null        outline a specific cell (e.g. best)
 *   lowlight:  { i, j } | null        outline a specific cell (e.g. worst)
 */
export default function Heatmap({
  grid,
  xs,
  ys,
  xLabel = 'x',
  yLabel = 'y',
  metricLabel = 'value',
  colorScheme = 'viridis',
  highlight = null,
  lowlight = null,
}) {
  const [hover, setHover] = useState(null);

  const { vmin, vmax } = useMemo(() => {
    let vmin = Infinity;
    let vmax = -Infinity;
    for (const row of grid) {
      for (const v of row) {
        if (Number.isFinite(v)) {
          if (v < vmin) vmin = v;
          if (v > vmax) vmax = v;
        }
      }
    }
    if (!Number.isFinite(vmin) || !Number.isFinite(vmax)) {
      return { vmin: 0, vmax: 1 };
    }
    if (vmin === vmax) vmax = vmin + 1;
    return { vmin, vmax };
  }, [grid]);

  const ny = grid.length;
  const nx = grid[0]?.length ?? 0;
  const padL = 56;
  const padR = 90;
  const padT = 16;
  const padB = 36;
  const cellW = 22;
  const cellH = 22;
  const w = padL + nx * cellW + padR;
  const h = padT + ny * cellH + padB;

  const colorAt = (v) => {
    if (!Number.isFinite(v)) return '#1E2A44';
    const t = (v - vmin) / (vmax - vmin);
    return interp(colorScheme, Math.min(Math.max(t, 0), 1));
  };

  // Fewer ticks if too crowded
  const xTickIdx = sparseIndices(nx, 6);
  const yTickIdx = sparseIndices(ny, 6);

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} role="img" aria-label="Parametric heatmap">
        <g transform={`translate(${padL},${padT})`}>
          {grid.map((row, j) =>
            row.map((v, i) => {
              const isHover = hover && hover.i === i && hover.j === j;
              const isBest  = highlight && highlight.i === i && highlight.j === j;
              const isWorst = lowlight  && lowlight.i  === i && lowlight.j  === j;
              const stroke = isBest ? '#FACC15'
                           : isWorst ? '#EF4444'
                           : isHover ? '#22D3EE'
                           : 'rgba(0,0,0,0.4)';
              const sw = isBest || isWorst ? 2 : 0.6;
              return (
                <rect
                  key={`${i}-${j}`}
                  x={i * cellW}
                  y={(ny - 1 - j) * cellH}
                  width={cellW}
                  height={cellH}
                  fill={colorAt(v)}
                  stroke={stroke}
                  strokeWidth={sw}
                  onMouseEnter={() => setHover({ i, j, v })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })
          )}
          {/* Best / worst marker glyphs on top of cells */}
          {highlight && (
            <MarkerStar
              x={highlight.i * cellW + cellW / 2}
              y={(ny - 1 - highlight.j) * cellH + cellH / 2}
              color="#FACC15"
            />
          )}
          {lowlight && (
            <MarkerCross
              x={lowlight.i * cellW + cellW / 2}
              y={(ny - 1 - lowlight.j) * cellH + cellH / 2}
              color="#EF4444"
            />
          )}
        </g>
        {xTickIdx.map((i) => (
          <g key={`xt-${i}`} transform={`translate(${padL + i * cellW + cellW / 2},${padT + ny * cellH})`}>
            <line y2={4} stroke="rgba(148,163,184,0.4)" />
            <text y={16} fontSize={10} textAnchor="middle" fill="#94A3B8">
              {fmtCompact(xs[i])}
            </text>
          </g>
        ))}
        {yTickIdx.map((j) => (
          <g key={`yt-${j}`} transform={`translate(${padL},${padT + (ny - 1 - j) * cellH + cellH / 2})`}>
            <line x2={-4} stroke="rgba(148,163,184,0.4)" />
            <text x={-8} y={3} fontSize={10} textAnchor="end" fill="#94A3B8">
              {fmtCompact(ys[j])}
            </text>
          </g>
        ))}
        <text x={padL + (nx * cellW) / 2} y={h - 6} textAnchor="middle" fontSize={11} fill="#CBD5E1">
          {xLabel}
        </text>
        <text
          transform={`translate(14,${padT + (ny * cellH) / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize={11}
          fill="#CBD5E1"
        >
          {yLabel}
        </text>
        <Legend
          x={padL + nx * cellW + 16}
          y={padT}
          height={ny * cellH}
          vmin={vmin}
          vmax={vmax}
          colorScheme={colorScheme}
          label={metricLabel}
        />
        {hover && (
          <text
            x={padL + nx * cellW}
            y={h - 6}
            textAnchor="end"
            fontSize={11}
            fill="#22D3EE"
          >
            ({fmtCompact(xs[hover.i])}, {fmtCompact(ys[hover.j])}) →{' '}
            {Number.isFinite(hover.v) ? fmtCompact(hover.v) : '—'}
          </text>
        )}
      </svg>
    </div>
  );
}

function MarkerStar({ x, y, color }) {
  return (
    <g transform={`translate(${x},${y})`} pointerEvents="none">
      <circle r={6} fill="rgba(11,18,32,0.85)" />
      <text
        x={0} y={3} textAnchor="middle"
        fontSize={11} fontWeight={700}
        fill={color}
      >★</text>
    </g>
  );
}

function MarkerCross({ x, y, color }) {
  return (
    <g transform={`translate(${x},${y})`} pointerEvents="none">
      <circle r={6} fill="rgba(11,18,32,0.85)" />
      <text
        x={0} y={3.5} textAnchor="middle"
        fontSize={11} fontWeight={700}
        fill={color}
      >✕</text>
    </g>
  );
}

function Legend({ x, y, height, vmin, vmax, colorScheme, label }) {
  const w = 12;
  const stops = 24;
  const gradId = `lg-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <g transform={`translate(${x},${y})`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
          {Array.from({ length: stops + 1 }).map((_, i) => (
            <stop
              key={i}
              offset={`${(100 * i) / stops}%`}
              stopColor={interp(colorScheme, i / stops)}
            />
          ))}
        </linearGradient>
      </defs>
      <rect width={w} height={height} fill={`url(#${gradId})`} stroke="rgba(148,163,184,0.3)" />
      <text x={w + 6} y={10} fontSize={10} fill="#94A3B8">
        {fmtCompact(vmax)}
      </text>
      <text x={w + 6} y={height} fontSize={10} fill="#94A3B8">
        {fmtCompact(vmin)}
      </text>
      <text
        transform={`translate(${w + 6},${height / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={11}
        fill="#CBD5E1"
      >
        {label}
      </text>
    </g>
  );
}

function sparseIndices(n, max) {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  const step = Math.max(1, Math.round(n / max));
  const out = [];
  for (let i = 0; i < n; i += step) out.push(i);
  if (out[out.length - 1] !== n - 1) out.push(n - 1);
  return out;
}

// Color interpolation
function interp(scheme, t) {
  const ramp = SCHEMES[scheme] ?? SCHEMES.viridis;
  const n = ramp.length - 1;
  const f = t * n;
  const i = Math.floor(f);
  const r = f - i;
  if (i >= n) return ramp[n];
  const a = ramp[i];
  const b = ramp[i + 1];
  return mix(a, b, r);
}

function mix([r1, g1, b1], [r2, g2, b2], t) {
  const lerp = (a, b) => Math.round(a + (b - a) * t);
  return `rgb(${lerp(r1, r2)},${lerp(g1, g2)},${lerp(b1, b2)})`;
}

const SCHEMES = {
  viridis: [
    [68, 1, 84],
    [59, 82, 139],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37],
  ],
  rdylgn: [
    [165, 0, 38],
    [253, 174, 97],
    [255, 255, 191],
    [166, 217, 106],
    [26, 152, 80],
  ],
  cyan: [
    [11, 18, 32],
    [15, 23, 38],
    [12, 74, 110],
    [14, 165, 233],
    [125, 211, 252],
  ],
};
