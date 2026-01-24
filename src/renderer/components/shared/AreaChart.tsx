import { useMemo } from "react";

interface AreaChartProps {
  data?: number[];
  height?: number;
  labels?: string[];
}

function generateMockData(): number[] {
  return [320, 450, 380, 520, 480, 610, 550];
}

function getDefaultLabels(): string[] {
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString("zh-CN", { weekday: "short" }));
  }
  return labels;
}

function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const controlX = (current.x + next.x) / 2;

    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  return path;
}

export function AreaChart({ data, height = 160, labels }: AreaChartProps) {
  const chartData = data || generateMockData();
  const chartLabels = labels || getDefaultLabels();

  const { linePath, areaPath, points, maxValue } = useMemo(() => {
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 400;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const max = Math.max(...chartData) * 1.1;
    const min = 0;

    const pts = chartData.map((value, index) => ({
      x: padding.left + (index / (chartData.length - 1)) * chartWidth,
      y:
        padding.top + chartHeight - ((value - min) / (max - min)) * chartHeight,
      value,
    }));

    const line = createSmoothPath(pts);

    const area =
      line +
      ` L ${pts[pts.length - 1].x} ${padding.top + chartHeight}` +
      ` L ${pts[0].x} ${padding.top + chartHeight} Z`;

    return { linePath: line, areaPath: area, points: pts, maxValue: max };
  }, [chartData, height]);

  return (
    <div className="glass-card glass-card-sage p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          请求趋势
        </h3>
        <div className="text-xs text-[var(--text-dim)]">最近 7 天</div>
      </div>

      <svg viewBox="0 0 400 160" className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="sageGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(156, 175, 136, 0.4)" />
            <stop offset="100%" stopColor="rgba(156, 175, 136, 0)" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = 20 + (160 - 50) * ratio;
          return (
            <g key={ratio}>
              <line
                x1="40"
                y1={y}
                x2="380"
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="4,4"
              />
              <text
                x="35"
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-[var(--text-dim)]"
              >
                {Math.round(maxValue * (1 - ratio))}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#sageGradient)" className="opacity-80" />

        <path
          d={linePath}
          className="area-chart-line area-chart-line-animated"
        />

        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="var(--bg-primary)"
              stroke="var(--accent-sage)"
              strokeWidth="2"
              className="transition-all duration-200 hover:r-6"
            />
            <text
              x={point.x}
              y={160 - 8}
              textAnchor="middle"
              className="text-[10px] fill-[var(--text-dim)]"
            >
              {chartLabels[index]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
