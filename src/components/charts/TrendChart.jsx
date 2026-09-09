"use client";

import { useId } from "react";
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  Brush,
  CartesianGrid,
  Legend,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AREA_FILL_STOPS,
  BRUSH_PROPS,
  CHART_COLORS,
  GRID_PROPS,
  X_AXIS_PROPS,
  Y_AXIS_PROPS,
  formatValue,
} from "@/lib/chartTheme";

/**
 * Portal trend chart, styled after the hopeCloud "Running Curve".
 *
 * One component covers every shape the portal needs — area, line, bars, or a
 * bar+line combo on two axes — so the pages no longer carry four near-identical
 * copies of the same Recharts tree. Dense ranges get a brush instead of the old
 * sticky-Y-axis + horizontal-scroll workaround.
 *
 * series: [{ key, name, type: 'area'|'line'|'bar', color, unit, decimals, axis }]
 */
export function TrendChart({
  data = [],
  xKey = "label",
  series = [],
  height = 420,
  unitLeft,
  unitRight,
  brush = false,
  summary,
  markers,
  yLeftFormatter,
  yRightFormatter,
  xInterval,
  xAngle = 0,
  tooltipLabelFormatter,
  empty = "No data in this range yet.",
}) {
  const gradientId = useId().replace(/:/g, "");
  const hasRight = series.some((s) => s.axis === "right");
  const primary = series[0];

  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
        {empty}
      </div>
    );
  }

  return (
    <div className="w-full">
      {summary && (
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-1 pb-2 text-sm">
          {summary}
        </div>
      )}

      {/* Axis unit captions sit above the plot, as they do on hopeCloud. */}
      {(unitLeft || unitRight) && (
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span>{unitLeft}</span>
          <span>{unitRight}</span>
        </div>
      )}

      <div style={{ width: "100%", height }}>
        {/* Explicit height + initialDimension, matching the data-logger
            charts: a bare container starts at recharts' {-1,-1} default and
            logs a "width(-1) and height(-1)" warning on the first render,
            before its ResizeObserver has measured anything. */}
        <ResponsiveContainer
          width="100%"
          height={height}
          initialDimension={{ width: 600, height }}
        >
          <ComposedChart
            data={data}
            margin={{ top: 8, right: hasRight ? 8 : 16, left: 0, bottom: 0 }}
          >
            <defs>
              {series
                .filter((s) => s.type === "area")
                .map((s) => (
                  <linearGradient
                    key={s.key}
                    id={`${gradientId}-${s.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    {AREA_FILL_STOPS.map((stop) => (
                      <stop
                        key={stop.offset}
                        offset={stop.offset}
                        stopColor={s.color ?? CHART_COLORS.primary}
                        stopOpacity={stop.opacity}
                      />
                    ))}
                  </linearGradient>
                ))}
            </defs>

            <CartesianGrid {...GRID_PROPS} />

            <XAxis
              dataKey={xKey}
              {...X_AXIS_PROPS}
              interval={xInterval}
              angle={xAngle}
              textAnchor={xAngle ? "end" : "middle"}
              height={xAngle ? 52 : 30}
              minTickGap={xAngle ? 0 : 24}
            />

            <YAxis
              yAxisId="left"
              {...Y_AXIS_PROPS}
              domain={[0, "auto"]}
              tickFormatter={yLeftFormatter}
            />
            {hasRight && (
              <YAxis
                yAxisId="right"
                orientation="right"
                {...Y_AXIS_PROPS}
                domain={[0, "auto"]}
                tickFormatter={yRightFormatter}
              />
            )}

            <Tooltip
              cursor={{ stroke: CHART_COLORS.primaryFaint, strokeWidth: 1 }}
              content={
                <TrendTooltip series={series} labelFormatter={tooltipLabelFormatter} />
              }
            />

            {series.length > 1 && (
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: CHART_COLORS.axis, paddingTop: 6 }}
              />
            )}

            {series.map((s) => {
              const color = s.color ?? CHART_COLORS.primary;
              const axisId = s.axis === "right" ? "right" : "left";

              if (s.type === "bar") {
                return (
                  <Bar
                    key={s.key}
                    yAxisId={axisId}
                    dataKey={s.key}
                    name={s.name}
                    fill={color}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={s.maxBarSize ?? 28}
                    isAnimationActive={false}
                  />
                );
              }

              if (s.type === "area") {
                return (
                  <Area
                    key={s.key}
                    yAxisId={axisId}
                    type={s.curve ?? "linear"}
                    dataKey={s.key}
                    name={s.name}
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#${gradientId}-${s.key})`}
                    dot={false}
                    activeDot={{ r: 4, fill: color, stroke: "#fff", strokeWidth: 2 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                );
              }

              return (
                <Line
                  key={s.key}
                  yAxisId={axisId}
                  type={s.curve ?? "monotone"}
                  dataKey={s.key}
                  name={s.name}
                  stroke={color}
                  strokeWidth={2}
                  dot={s.dot === false ? false : { r: 2, fill: color, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: color, stroke: "#fff", strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              );
            })}

            {markers?.hi && (
              <ReferenceDot
                yAxisId="left"
                x={markers.hi.x}
                y={markers.hi.y}
                r={5}
                fill={CHART_COLORS.danger}
                stroke="#fff"
                strokeWidth={1.5}
                isFront
              />
            )}
            {markers?.lo && (
              <ReferenceDot
                yAxisId="left"
                x={markers.lo.x}
                y={markers.lo.y}
                r={5}
                fill={CHART_COLORS.teal}
                stroke="#fff"
                strokeWidth={1.5}
                isFront
              />
            )}

            {brush && primary && (
              <Brush dataKey={xKey} {...BRUSH_PROPS}>
                <ComposedChart>
                  <Area
                    type="linear"
                    dataKey={primary.key}
                    stroke={CHART_COLORS.primaryFaint}
                    fill={CHART_COLORS.primaryFaint}
                    fillOpacity={0.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </Brush>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Tooltip readout lifted from the hopeCloud "Running Curve" so the two portals
// read the same: a white 4px card, the x-label on its own line, then one
// "<dot> Name: value unit" row per series. Their exact spec — 14px/21px text in
// #666, 10px padding, a 10px dot, and only the value carrying weight 600.
function TrendTooltip({ active, payload, label, series, labelFormatter }) {
  if (!active || !payload?.length) return null;

  const meta = new Map(series.map((s) => [s.key, s]));

  return (
    <div
      className="whitespace-nowrap rounded bg-white"
      style={{
        padding: 10,
        color: "#666",
        fontSize: 14,
        lineHeight: "21px",
        boxShadow: "1px 2px 10px rgba(0, 0, 0, 0.2)",
      }}
    >
      <div>{labelFormatter ? labelFormatter(label, payload) : label}</div>
      {payload.map((p) => {
        const s = meta.get(p.dataKey) ?? {};
        // `transform` lets a series store raw units (e.g. watts) but read out
        // in display units (kW) without duplicating the data.
        const value = s.transform ? s.transform(p.value) : p.value;
        return (
          <div key={p.dataKey}>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                marginRight: 4,
                borderRadius: 10,
                backgroundColor: p.color,
              }}
            />
            {s.name ?? p.name}:{" "}
            <span style={{ fontWeight: 600 }}>
              {formatValue(value, s.decimals ?? 2)}
              {s.unit ? ` ${s.unit}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
