import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../lib/format";
import {
  CURVE_PERCENTILES,
  formatPercentile,
  type CurvePoint,
  type GrowthObservation,
} from "../lib/percentiles";

const WIDTH = 860;
const HEIGHT = 420;
const PAD = { top: 18, right: 36, bottom: 52, left: 54 };

const CURVE_STYLE: Record<number, { color: string; width: number; dash?: string }> = {
  3: { color: "#c9a227", width: 1.6 },
  10: { color: "#8aa0a4", width: 1, dash: "5 4" },
  25: { color: "#8aa0a4", width: 1, dash: "2 4" },
  50: { color: "#1b6b6a", width: 2.2 },
  75: { color: "#8aa0a4", width: 1, dash: "2 4" },
  90: { color: "#8aa0a4", width: 1, dash: "5 4" },
  97: { color: "#c9a227", width: 1.6 },
};

function niceTicks(min: number, max: number, count = 6) {
  const span = Math.max(max - min, 1e-6);
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const err = raw / mag;
  const step = mag * (err >= 7.5 ? 10 : err >= 3 ? 5 : err >= 1.5 ? 2 : 1);
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= max + step / 2; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }
  return ticks;
}

function ageTicks(maxDays: number) {
  const maxMonths = maxDays / 30.4375;
  if (maxMonths <= 24) {
    const step = maxMonths <= 12 ? 1 : 2;
    const ticks: number[] = [];
    for (let month = 0; month * 30.4375 <= maxDays + 1; month += step) {
      ticks.push(month * 30.4375);
    }
    return { ticks, label: (days: number) => `${Math.round(days / 30.4375)} m` };
  }
  if (maxMonths <= 72) {
    const ticks: number[] = [];
    for (let month = 0; month * 30.4375 <= maxDays + 1; month += 6) {
      ticks.push(month * 30.4375);
    }
    return {
      ticks,
      label: (days: number) => {
        const years = days / 365.25;
        return years >= 1 && years % 1 < 0.05 ? `${Math.round(years)} a` : `${Math.round(days / 30.4375)} m`;
      },
    };
  }
  const ticks: number[] = [];
  for (let year = 0; year * 365.25 <= maxDays + 1; year += 1) {
    ticks.push(year * 365.25);
  }
  return { ticks, label: (days: number) => `${Math.round(days / 365.25)} a` };
}

function toPath(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

export function GrowthChart({
  unit,
  curves,
  observations,
  xMin,
  xMax,
}: {
  unit: string;
  curves: CurvePoint[];
  observations: GrowthObservation[];
  xMin: number;
  xMax: number;
}) {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(null);
  const plot = useMemo(() => {
    const values = [
      ...curves.flatMap((row) => CURVE_PERCENTILES.map((percentile) => row[`p${percentile}`]).filter(Boolean)),
      ...observations.map((item) => item.value),
    ];
    const rawMin = values.length ? Math.min(...values) : 0;
    const rawMax = values.length ? Math.max(...values) : 1;
    const pad = Math.max((rawMax - rawMin) * 0.08, rawMax * 0.03, 0.4);
    const yMin = Math.max(0, rawMin - pad);
    const yMax = rawMax + pad;
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const x = (ageDays: number) => PAD.left + ((ageDays - xMin) / Math.max(xMax - xMin, 1)) * innerW;
    const y = (value: number) => PAD.top + (1 - (value - yMin) / Math.max(yMax - yMin, 1e-6)) * innerH;
    return { yMin, yMax, x, y };
  }, [curves, observations, xMin, xMax]);

  const xAxis = ageTicks(xMax);
  const yTicks = niceTicks(plot.yMin, plot.yMax);
  const active = observations.find((item) => item.consultationId === activeId) ?? null;

  return (
    <div className="relative overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full min-w-[640px]" role="img">
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={plot.y(tick)}
              y2={plot.y(tick)}
              stroke="#e6eeea"
            />
            <text x={PAD.left - 8} y={plot.y(tick) + 3} textAnchor="end" className="fill-muted" fontSize="11">
              {Number.isInteger(tick) ? tick : tick.toFixed(1)}
            </text>
          </g>
        ))}
        {xAxis.ticks
          .filter((tick) => tick >= xMin - 1 && tick <= xMax + 1)
          .map((tick) => (
            <g key={`x-${tick}`}>
              <line
                x1={plot.x(tick)}
                x2={plot.x(tick)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                stroke="#eef3f1"
              />
              <text
                x={plot.x(tick)}
                y={HEIGHT - PAD.bottom + 18}
                textAnchor="middle"
                className="fill-muted"
                fontSize="11"
              >
                {xAxis.label(tick)}
              </text>
            </g>
          ))}
        <line
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={HEIGHT - PAD.bottom}
          stroke="#dfe6e3"
        />
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={HEIGHT - PAD.bottom}
          y2={HEIGHT - PAD.bottom}
          stroke="#dfe6e3"
        />
        {CURVE_PERCENTILES.map((percentile) => {
          const style = CURVE_STYLE[percentile];
          const path = toPath(
            curves
              .filter((row) => row[`p${percentile}`] != null)
              .map((row) => ({ x: plot.x(row.ageDays), y: plot.y(row[`p${percentile}`]) })),
          );
          if (!path) return null;
          return (
            <g key={percentile}>
              <path
                d={path}
                fill="none"
                stroke={style.color}
                strokeWidth={style.width}
                strokeDasharray={style.dash}
              />
              {curves.length > 0 && curves[curves.length - 1][`p${percentile}`] != null && (
                <text
                  x={WIDTH - PAD.right + 2}
                  y={plot.y(curves[curves.length - 1][`p${percentile}`]) + 3}
                  fontSize="9"
                  fill={style.color}
                >
                  p{percentile}
                </text>
              )}
            </g>
          );
        })}
        {observations.length > 1 && (
          <path
            d={toPath(observations.map((item) => ({ x: plot.x(item.ageDays), y: plot.y(item.value) })))}
            fill="none"
            stroke="#124e4d"
            strokeWidth="2.4"
          />
        )}
        {observations.map((item, index) => {
          const cx = plot.x(item.ageDays);
          const cy = plot.y(item.value);
          const previousX = index > 0 ? plot.x(observations[index - 1].ageDays) : -999;
          return (
            <g key={item.consultationId}>
              <circle cx={cx} cy={cy} r={activeId === item.consultationId ? 6.5 : 5} fill="#1b6b6a" />
              <circle cx={cx} cy={cy} r="2.2" fill="#fff" />
              {cx - previousX > 72 && (
                <text x={cx} y={HEIGHT - PAD.bottom + 34} textAnchor="middle" fontSize="10" className="fill-ink">
                  {formatDate(item.date)}
                </text>
              )}
            </g>
          );
        })}
        <text x={12} y={16} fontSize="11" className="fill-muted">
          {unit}
        </text>
        <text x={WIDTH / 2} y={HEIGHT - 4} textAnchor="middle" fontSize="11" className="fill-muted">
          Edad
        </text>
        {observations.map((item) => (
          <circle
            key={`${item.consultationId}-hit`}
            cx={plot.x(item.ageDays)}
            cy={plot.y(item.value)}
            r="12"
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => setActiveId(item.consultationId)}
            onMouseLeave={() => setActiveId(null)}
            onClick={() => navigate(`/consultas/${item.consultationId}`)}
          />
        ))}
      </svg>
      {active && (
        <div className="pointer-events-none absolute top-3 right-3 rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-sm">
          <p className="font-semibold">{formatDate(active.date)}</p>
          <p className="mt-1 text-muted">
            {active.value} {unit}
            {active.assessment ? ` · ${formatPercentile(active.assessment)}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
