import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import { Download, FileSpreadsheet } from "lucide-react";
import { useMemo, useRef } from "react";

export interface RoundMarker {
  t: number;
  round: number;
}

function tsToRound(t: number, markers: RoundMarker[]): number | null {
  let result: number | null = null;
  for (const m of markers) {
    if (t >= m.t) result = m.round;
    else break;
  }
  return result;
}

function sanitizeFilename(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function downloadBlob(content: BlobPart, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(
  rows: Record<string, number | null | string>[],
  headers: string[],
): string {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

function inlineSvgStyles(source: SVGSVGElement, target: SVGSVGElement): void {
  const sourceNodes = [source, ...Array.from(source.querySelectorAll("*"))];
  const targetNodes = [target, ...Array.from(target.querySelectorAll("*"))];
  const properties = [
    "fill",
    "stroke",
    "stroke-width",
    "stroke-dasharray",
    "font-family",
    "font-size",
    "font-weight",
    "opacity",
  ];

  sourceNodes.forEach((node, index) => {
    const targetNode = targetNodes[index] as SVGElement | undefined;
    if (!targetNode) return;
    const style = window.getComputedStyle(node as Element);
    for (const property of properties) {
      const value = style.getPropertyValue(property);
      if (value) targetNode.style.setProperty(property, value);
    }
  });
}

export function TrendChart({
  title,
  description,
  data,
  lines,
  config,
  roundMarkers,
  xAxis = "time",
}: {
  title: string;
  description?: string;
  data: Record<string, number | null | string>[];
  lines: { key: string; color: string }[];
  config: ChartConfig;
  roundMarkers?: RoundMarker[];
  xAxis?: "time" | "round";
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const useRounds = xAxis === "round" && (roundMarkers?.length ?? 0) > 0;

  const chartData = useMemo(() => {
    if (!useRounds) return data;
    // Deduplicate: last value per round
    const roundMap = new Map<number, Record<string, number | null | string>>();
    for (const point of data) {
      const round = tsToRound(Number(point.t), roundMarkers!);
      if (round === null) continue;
      roundMap.set(round, { ...point, _round: round });
    }
    return Array.from(roundMap.values()).sort((a, b) => Number(a._round) - Number(b._round));
  }, [data, roundMarkers, useRounds]);

  const roundAtTs = !useRounds && roundMarkers
    ? new Map(roundMarkers.map((m) => [m.t, m.round]))
    : undefined;
  const filename = sanitizeFilename(title) || "trend-chart";
  const csvHeaders = useMemo(() => {
    const base = useRounds ? ["_round", "t"] : ["t"];
    return [...base, ...lines.map((line) => line.key)];
  }, [lines, useRounds]);

  if (data.length < 2) return null;

  function handleExportCsv(): void {
    downloadBlob(
      toCsv(chartData, csvHeaders),
      `${filename}.csv`,
      "text/csv;charset=utf-8",
    );
  }

  function handleExportSvg(): void {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) return;

    const clone = svg.cloneNode(true) as SVGSVGElement;
    inlineSvgStyles(svg, clone);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const { width, height } = svg.getBoundingClientRect();

    const vbParts = (svg.getAttribute("viewBox") ?? "").split(/\s+/).map(Number);
    const [vbX, vbY, vbW, vbH] = vbParts.length === 4 ? vbParts : [0, 0, width, height];
    const legendHeightVB = lines.length > 1 ? 20 : 0;

    if (width && height) {
      clone.setAttribute("width", String(Math.ceil(width)));
      clone.setAttribute("height", String(Math.ceil(height + (height * legendHeightVB) / vbH)));
      clone.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH + legendHeightVB}`);
    }

    if (lines.length > 1) {
      const resolvedColors = Array.from(
        clone.querySelectorAll(".recharts-layer.recharts-line path.recharts-line-curve"),
      ).map((path) => (path as SVGPathElement).style.stroke || (path as SVGPathElement).getAttribute("stroke") || "#888");

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("transform", `translate(44, ${vbH + 4})`);
      lines.forEach(({ key }, i) => {
        const label = String((config[key] as { label?: unknown })?.label ?? key);
        const x = i * 110;
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", String(x));
        rect.setAttribute("y", "4");
        rect.setAttribute("width", "14");
        rect.setAttribute("height", "2");
        rect.setAttribute("fill", resolvedColors[i] ?? "#888");
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", String(x + 18));
        text.setAttribute("y", "10");
        text.setAttribute("font-size", "9");
        text.setAttribute("font-family", "monospace");
        text.setAttribute("fill", "#888888");
        text.textContent = label;
        g.appendChild(rect);
        g.appendChild(text);
      });
      clone.appendChild(g);
    }

    const serializer = new XMLSerializer();
    const source = `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(clone)}`;
    downloadBlob(source, `${filename}.svg`, "image/svg+xml;charset=utf-8");
  }

  return (
    <div
      className="group flex flex-col gap-2 p-4 rounded-sm border"
      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate font-mono text-[9px] tracking-[0.08em] uppercase" style={{ color: "var(--text-secondary)" }}>
            {title}
          </p>
          {description && (
            <p className="font-mono text-[8px]" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
              {description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="Export chart as SVG"
            aria-label={`Export ${title} as SVG`}
            onClick={handleExportSvg}
          >
            <Download />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="Export chart data as CSV"
            aria-label={`Export ${title} data as CSV`}
            onClick={handleExportCsv}
          >
            <FileSpreadsheet />
          </Button>
        </div>
      </div>
      <ChartContainer ref={chartRef} config={config} className="h-48 w-full">
        <LineChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border-subtle)" strokeOpacity={0.3} />
          {!useRounds && roundMarkers?.map(({ t, round }) => (
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
            dataKey={useRounds ? "_round" : "t"}
            tickFormatter={useRounds
              ? (v: number) => `R${v}`
              : (v: number) => new Date(v * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            }
            tick={{ fontSize: 9, fill: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
            tickLine={false} axisLine={false} minTickGap={useRounds ? 20 : 60}
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
                  if (useRounds) return `Round ${v}`;
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
