// Shared Recharts theming primitives so every chart looks consistent.
// Pull these constants/components into each tab — no global theme provider needed.

export const PLOT_THEME = {
  axis: '#94A3B8',
  axisLabel: '#CBD5E1',
  grid: 'rgba(148, 163, 184, 0.16)',
  gridStrong: 'rgba(148, 163, 184, 0.28)',
  tooltipBg: '#0F1726',
  tooltipBorder: '#1E2A44',
  reference: 'rgba(34, 211, 238, 0.65)',
  hotspot: '#FACC15',
};

export const SPECIES_COLORS = {
  A: '#EF4444',
  B: '#3B82F6',
  C: '#10B981',
  D: '#A855F7',
  I: '#94A3B8',
};

export const speciesColor = (id, fallbackPalette) => {
  if (SPECIES_COLORS[id]) return SPECIES_COLORS[id];
  const palette = fallbackPalette || ['#22D3EE', '#14B8A6', '#F97316', '#EAB308', '#6366F1', '#EC4899'];
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
};

export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: PLOT_THEME.tooltipBg,
    border: `1px solid ${PLOT_THEME.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: '#E5E7EB',
  },
  labelStyle: { color: '#94A3B8', marginBottom: 4 },
  itemStyle: { color: '#E5E7EB' },
};
