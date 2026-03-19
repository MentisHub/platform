import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";

export interface RoundMarker {
  t: number;
  round: number;
}

export function TrendChart({
  title,
  description,
  data,
  lines,
  config,
  roundMarkers,
}: {
  title: string;
  description?: string;
  data: Record<string, number | null | string>[];
  lines: { key: string; color: string }[];
  config: ChartConfig;
  roundMarkers?: RoundMarker[];
}) {
  if (data.length < 2) return null;

  const roundAtTs = roundMarkers
    ? new Map(roundMarkers.map((m) => [m.t, m.round]))
    : undefined;

  return (
    <div
      className="flex flex-col gap-2 p-4 rounded-sm border"
      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex flex-col gap-0.5">
        <p className="font-mono text-[9px] tracking-[0.08em] uppercase" style={{ color: "var(--text-secondary)" }}>
          {title}
        </p>
        {description && (
          <p className="font-mono text-[8px]" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
            {description}
          </p>
        )}
      </div>
      <ChartContainer config={config} className="h-32 w-full">
        <LineChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border-subtle)" strokeOpacity={0.3} />
          {roundMarkers?.map(({ t, round }) => (
            <ReferenceLine
              key={`r-${round}`}
              x={t}
              stroke="var(--text-secondary)"
              strokeDasharray="2 3"
              strokeOpacity={0.3}
              label={{
                value: `R${round}`,
                position: "top",
                fill: "var(--text-secondary)",
                fontSize: 8,
                fontFamily: "var(--font-mono)",
              }}
            />
          ))}
          <XAxis
            dataKey="t"
            tickFormatter={(v: number) => new Date(v * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            tick={{ fontSize: 9, fill: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
            tickLine={false} axisLine={false} minTickGap={60}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
            tickLine={false} axisLine={false} width={40}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(v) => {
                  const ts = Number(v);
                  if (!Number.isFinite(ts) || ts < 1_000_000_000) return String(v);
                  const time = new Date(ts * 1000).toLocaleTimeString();
                  const round = roundAtTs?.get(ts);
                  return round ? `Round ${round} · ${time}` : time;
                }}
              />
            }
          />
          {lines.map(({ key, color }) => (
            <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  );
}
