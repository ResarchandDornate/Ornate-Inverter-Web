// Chart theme for the Inverters portal.
//
// The palette and the axis/grid/tooltip treatment are modelled on the hopeCloud
// (Hopewind) monitoring portal, so the portal charts read as one system:
// a single blue accent carries the primary series, amber/red are reserved for
// secondary and fault series, and the plot furniture stays quiet — horizontal
// dashed rules only, no axis lines, grey ticks.

export const CHART_COLORS = {
  primary: "#2c7be5", // main series — line, bars, area stroke
  primarySoft: "#78a3ff", // secondary blue (comparison series)
  primaryFaint: "#a6c0fe", // brush traveller / panorama
  accent: "#eec67a", // amber — revenue / secondary axis
  accentStrong: "#e6b617",
  danger: "#d03050", // faults, peak markers
  teal: "#0f766e", // low markers
  grid: "#eef0f3",
  axis: "#6e7079",
  neutral: "#dddddd",
};

// Series colours in the order they should be handed out for multi-series charts.
export const SERIES_CYCLE = [
  CHART_COLORS.primary,
  CHART_COLORS.accent,
  CHART_COLORS.primarySoft,
  CHART_COLORS.danger,
  CHART_COLORS.accentStrong,
];

export const AXIS_TICK = { fontSize: 11, fill: CHART_COLORS.axis };
export const AXIS_TICK_SM = { fontSize: 10, fill: CHART_COLORS.axis };

// Shared props — spread these onto the Recharts primitives.
export const GRID_PROPS = {
  strokeDasharray: "4 4",
  stroke: CHART_COLORS.grid,
  vertical: false,
};

export const X_AXIS_PROPS = {
  tick: AXIS_TICK_SM,
  tickLine: false,
  axisLine: { stroke: CHART_COLORS.grid },
  dy: 4,
};

export const Y_AXIS_PROPS = {
  tick: AXIS_TICK,
  tickLine: false,
  axisLine: false,
  width: 62,
};

export const BRUSH_PROPS = {
  height: 26,
  travellerWidth: 8,
  stroke: CHART_COLORS.primaryFaint,
  fill: "#f5f8fe",
};

// Gradient stops for the area fill under a line (hopeCloud uses a very light
// wash — the line stays the emphasis, the fill only gives the curve weight).
export const AREA_FILL_STOPS = [
  { offset: "0%", opacity: 0.22 },
  { offset: "100%", opacity: 0.01 },
];

// Rounded to a sensible number of decimals without dropping small values to 0.
export function formatValue(value, decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "–";
  if (n !== 0 && Math.abs(n) < 0.01) return n.toExponential(1);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
