"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeleteFab } from "../queries";
import { relativeTime } from "@/features/training/utils";
import type { FabResponse } from "@platform/contracts";
import { Package, Trash2 } from "lucide-react";

function formatBytes(bytes: string): string {
  const n = parseInt(bytes, 10);
  if (isNaN(n)) return bytes;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function FabRow({
  fab,
  orgId,
  onTagClick,
}: {
  fab: FabResponse;
  orgId: string;
  onTagClick?: (tag: string) => void;
}) {
  const deleteMutation = useDeleteFab(orgId);

  return (
    <div
      className="flex items-start gap-4 px-4 py-3 rounded-sm border"
      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
    >
      <div
        className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "var(--surface-3)" }}
      >
        <Package size={14} style={{ color: "var(--amber-primary)" }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-mono text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
            {fab.name}
          </p>
          {fab.isDefault && <Badge variant="muted">Default</Badge>}
          {!fab.isDefault && fab.isPublic && <Badge variant="success">Public</Badge>}
        </div>

        <p className="font-mono text-[10px] mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
          {fab.publisherName}
          {fab.description ? ` · ${fab.description}` : ""}
        </p>

        {fab.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {fab.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick?.(tag)}
                className="font-mono text-[9px] tracking-[0.06em] px-1.5 py-0.5 rounded-sm transition-opacity hover:opacity-70"
                style={{
                  background: "color-mix(in srgb, var(--amber-primary) 10%, transparent)",
                  color: "var(--amber-primary)",
                  border: "1px solid color-mix(in srgb, var(--amber-primary) 20%, transparent)",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
            v{fab.version}
          </span>
          <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
            {formatBytes(fab.sizeBytes)}
          </span>
          {!fab.isDefault && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => deleteMutation.mutate(fab.id)}
              disabled={deleteMutation.isPending}
              aria-label="Delete FAB"
            >
              <Trash2 size={12} />
            </Button>
          )}
        </div>
        <span className="font-mono text-[9px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
          {relativeTime(fab.createdAt)}
        </span>
      </div>
    </div>
  );
}
