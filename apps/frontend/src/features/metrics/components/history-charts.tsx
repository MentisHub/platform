import { stripPrefix } from "../utils";
import { TrendChart } from "./trend-chart";
import type { ChartConfig } from "@/components/ui/chart";

export function HistoryCharts({ seriesList, nodeNameMap }: { seriesList: { metric: Record<string, string>; values: [number, string][] }[]; nodeNameMap: Map<string, string> }) {
  const WANTED = ["fl_client_train_loss", "fl_client_eval_loss", "fl_client_train_accuracy", "fl_client_eval_accuracy", "fl_server_aggregated_train_loss", "fl_server_aggregated_eval_loss", "fl_server_aggregated_accuracy", "fl_server_round_current"] as const;

  type WantedKey = (typeof WANTED)[number];

  const COLORS: Record<WantedKey, string> = {
    fl_client_train_loss:            "var(--amber-primary)",
    fl_client_eval_loss:             "#f97316",
    fl_client_train_accuracy:        "#10b981",
    fl_client_eval_accuracy:         "#34d399",
    fl_server_aggregated_train_loss: "var(--amber-primary)",
    fl_server_aggregated_eval_loss:  "#f97316",
    fl_server_aggregated_accuracy:   "#10b981",
    fl_server_round_current:         "#a78bfa",
  };

  const GROUPS: { title: string; keys: WantedKey[] }[] = [
    { title: "Client — Loss",         keys: ["fl_client_train_loss", "fl_client_eval_loss"] },
    { title: "Client — Accuracy",     keys: ["fl_client_train_accuracy", "fl_client_eval_accuracy"] },
    { title: "Aggregated — Loss",     keys: ["fl_server_aggregated_train_loss", "fl_server_aggregated_eval_loss"] },
    { title: "Aggregated — Accuracy", keys: ["fl_server_aggregated_accuracy"] },
  ];

  if (seriesList.length === 0) return (
    <p className="font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>No historical metrics found for this run</p>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {GROUPS.map((g) => {
        const relevant = seriesList.filter((s) => g.keys.includes(stripPrefix(s.metric.__name__ ?? "") as WantedKey));
        if (relevant.length === 0) return null;

        const tsMap = new Map<number, Record<string, number>>();
        for (const s of relevant) {
          const name = stripPrefix(s.metric.__name__ ?? "") as WantedKey;
          const nid = s.metric.node_id;
          const key = nid ? `${name}__${nid}` : name;
          for (const [ts, val] of s.values) {
            const n = parseFloat(val);
            if (!Number.isFinite(n)) continue;
            const entry = tsMap.get(ts) ?? {};
            entry[key] = n;
            tsMap.set(ts, entry);
          }
        }
        const data = Array.from(tsMap.entries()).sort(([a], [b]) => a - b).map(([t, v]) => ({ t, ...v }));
        const lines = Array.from(new Set(data.flatMap((d) => Object.keys(d).filter((k) => k !== "t")))).map((key) => {
          const baseName = key.split("__")[0] as WantedKey;
          return { key, color: COLORS[baseName] ?? "#888" };
        });
        const cfg: ChartConfig = Object.fromEntries(lines.map(({ key, color }) => {
          const parts = key.split("__");
          const nid = parts[1];
          const label = nid ? (nodeNameMap.get(nid) ?? `node-${nid.slice(-6)}`) : parts[0];
          return [key, { label, color }];
        }));

        return <TrendChart key={g.title} title={g.title} data={data} lines={lines} config={cfg} />;
      })}
    </div>
  );
}
