import { formatDateRo } from "@/lib/format";

const SERIES_COLOR = "#3987e5"; // series-1, dark step (validated categorical palette)
const GRID_COLOR = "#2c2c2a";
const BASELINE_COLOR = "#383835";
const MUTED_COLOR = "#898781";

type Point = { date: string; count: number };

export default function VisitorsChart({ series }: { series: Point[] }) {
  const width = 720;
  const height = 200;
  const padding = { top: 12, right: 8, bottom: 24, left: 8 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const max = Math.max(1, ...series.map(p => p.count));
  const n = series.length || 1;
  const gap = 2;
  const barW = Math.max(1, plotW / n - gap);

  const labelEvery = n > 45 ? 7 : n > 20 ? 5 : n > 10 ? 2 : 1;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-[200px]"
      role="img"
      aria-label="Vizitatori unici pe zi"
    >
      {[0.25, 0.5, 0.75].map(f => (
        <line
          key={f}
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + plotH * (1 - f)}
          y2={padding.top + plotH * (1 - f)}
          stroke={GRID_COLOR}
          strokeWidth={1}
        />
      ))}
      <line
        x1={padding.left}
        x2={width - padding.right}
        y1={padding.top + plotH}
        y2={padding.top + plotH}
        stroke={BASELINE_COLOR}
        strokeWidth={1}
      />

      {series.map((p, i) => {
        const h = (p.count / max) * plotH;
        const x = padding.left + i * (plotW / n);
        const y = padding.top + plotH - h;
        const showLabel = i % labelEvery === 0;
        return (
          <g key={p.date}>
            <rect
              x={x}
              y={h > 0 ? y : padding.top + plotH - 1}
              width={barW}
              height={Math.max(h, 1)}
              rx={2}
              fill={SERIES_COLOR}
            >
              <title>
                {formatDateRo(new Date(p.date))} — {p.count} {p.count === 1 ? "vizitator" : "vizitatori"}
              </title>
            </rect>
            {showLabel && (
              <text
                x={x + barW / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize={9}
                fill={MUTED_COLOR}
              >
                {formatDateRo(new Date(p.date))}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
