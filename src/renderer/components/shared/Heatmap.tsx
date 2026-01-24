import { useMemo, useState } from "react";

interface HeatmapProps {
  data?: number[];
  weeks?: number;
}

function generateMockData(days: number): number[] {
  return Array.from({ length: days }, () => Math.floor(Math.random() * 5));
}

function getDateLabel(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function Heatmap({ data, weeks = 7 }: HeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  const cellData = useMemo(() => {
    const days = weeks * 7;
    return data || generateMockData(days);
  }, [data, weeks]);

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="glass-card glass-card-sage p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          API 调用活跃度
        </h3>
        <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
          <span>少</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm heatmap-${level}`}
              />
            ))}
          </div>
          <span>多</span>
        </div>
      </div>

      <div className="flex gap-1">
        <div className="flex flex-col gap-1 pr-2 text-xs text-[var(--text-dim)]">
          {weekDays.map((day, i) => (
            <div key={i} className="h-4 flex items-center justify-end">
              {i % 2 === 1 ? day : ""}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-1">
            {Array.from({ length: weeks }).map((_, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const cellIndex = weekIndex * 7 + dayIndex;
                  const value = cellData[cellIndex] || 0;
                  const daysAgo = cellData.length - 1 - cellIndex;

                  return (
                    <div
                      key={dayIndex}
                      className={`heatmap-cell w-4 h-4 heatmap-${value} cursor-pointer relative`}
                      onMouseEnter={() => setHoveredCell(cellIndex)}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {hoveredCell === cellIndex && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--glass-border)] rounded-lg text-xs text-[var(--text-primary)] whitespace-nowrap z-50 shadow-lg">
                          <div className="font-medium">
                            {getDateLabel(daysAgo)}
                          </div>
                          <div className="text-[var(--accent-sage)]">
                            {value * 127} 次调用
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-[var(--bg-primary)] border-r border-b border-[var(--glass-border)] rotate-45" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
