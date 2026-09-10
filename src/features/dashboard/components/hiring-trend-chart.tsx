"use client";

import { useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import type { HiringTrendPoint } from "@/services/dashboard-service";

const VIEW_WIDTH = 700;
const VIEW_HEIGHT = 200;
const PAD_LEFT = 12;
const PAD_RIGHT = 12;
const PAD_TOP = 28;
const PAD_BOTTOM = 26;
const SERIES_COLOR = "var(--seq-3)";

type HiringTrendChartProps = Readonly<{ points: HiringTrendPoint[] }>;

/**
 * Single-series line + area chart of new hires per month (last 12 months) —
 * a genuine trend-over-time story, distinct from the ordered-bucket bar
 * charts elsewhere on this dashboard. Mark specs (2px line, ~10% area fill,
 * >=8px end marker, hairline baseline) and the hover crosshair+tooltip follow
 * the dataviz skill's marks-and-anatomy / interaction references.
 */
export function HiringTrendChart({ points }: HiringTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const total = points.reduce((sum, point) => sum + point.count, 0);
  if (total === 0) {
    return (
      <EmptyState
        title="No hires in the last 12 months"
        description="New hires will show up here as employees are added."
      />
    );
  }

  const plotWidth = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const max = Math.max(1, ...points.map((p) => p.count));
  const baseline = PAD_TOP + plotHeight;

  const xAt = (i: number) => PAD_LEFT + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  const yAt = (count: number) => PAD_TOP + (1 - count / max) * plotHeight;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(p.count)}`).join(" ");
  const areaPath = `${linePath} L ${xAt(points.length - 1)} ${baseline} L ${xAt(0)} ${baseline} Z`;

  // Sparse x-axis labels (roughly quarterly) — the hover crosshair covers
  // identifying any individual month, so the axis itself only needs to orient.
  const tickEvery = Math.max(1, Math.ceil(points.length / 4));

  const last = points[points.length - 1];

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
    let nearest = 0;
    let nearestDistance = Infinity;
    points.forEach((_, i) => {
      const distance = Math.abs(xAt(i) - relativeX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="hiring-trend">
      <svg
        ref={svgRef}
        className="hiring-trend-svg"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label="New hires per month over the last 12 months"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <line
          className="hiring-trend-baseline"
          x1={PAD_LEFT}
          y1={baseline}
          x2={VIEW_WIDTH - PAD_RIGHT}
          y2={baseline}
        />
        <path className="hiring-trend-area" d={areaPath} fill={SERIES_COLOR} fillOpacity={0.1} stroke="none" />
        <path className="hiring-trend-line" d={linePath} stroke={SERIES_COLOR} />
        {hoverIndex !== null && (
          <line
            className="hiring-trend-crosshair"
            x1={xAt(hoverIndex)}
            y1={PAD_TOP}
            x2={xAt(hoverIndex)}
            y2={baseline}
          />
        )}
        {points.map((point, i) => {
          const isEnd = i === points.length - 1;
          const isHovered = i === hoverIndex;
          if (!isEnd && !isHovered) return null;
          return (
            <circle
              key={point.month}
              className="hiring-trend-dot"
              cx={xAt(i)}
              cy={yAt(point.count)}
              r={5}
              fill={SERIES_COLOR}
            />
          );
        })}
        <text className="hiring-trend-end-label" x={xAt(points.length - 1)} y={yAt(last.count) - 12}>
          {last.count}
        </text>
        {points.map((point, i) =>
          i % tickEvery === 0 || i === points.length - 1 ? (
            <text key={point.month} className="hiring-trend-tick" x={xAt(i)} y={VIEW_HEIGHT - 6}>
              {point.label}
            </text>
          ) : null,
        )}
      </svg>
      {hovered && (
        <div
          className="hiring-trend-tooltip"
          style={{ left: `${(xAt(hoverIndex!) / VIEW_WIDTH) * 100}%` }}
          role="status"
        >
          <b>{hovered.count}</b> hired · {hovered.label}
        </div>
      )}
    </div>
  );
}
