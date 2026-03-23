"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeleteNode } from "../queries";
import { nodeStatusVariant, NODE_STATUS_COLOR, relativeTime } from "../utils";
import { NodeMetadata } from "./node-metadata";
import type { NodeResponse } from "@platform/contracts";
import { Bot, Cpu, Trash2 } from "lucide-react";

interface NodeRowProps {
  node: NodeResponse;
  orgId: string;
  isServerApp?: boolean;
  collaboratorOrgId?: string;
}

export function NodeRow({ node, orgId, isServerApp = false, collaboratorOrgId }: NodeRowProps) {
  const deleteMutation = useDeleteNode(orgId);
  const isActive = node.status === "TRAINING" || node.status === "INITIALIZING";
  const metadata = node.metadata as Record<string, unknown> | null;

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-sm border relative overflow-hidden"
      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
    >
      {isActive && (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 animate-pulse"
          style={{ background: NODE_STATUS_COLOR[node.status] }}
        />
      )}

      <div
        className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
        style={{ background: "var(--surface-3)" }}
      >
        {isServerApp
          ? <Bot size={14} style={{ color: "var(--text-secondary)" }} />
          : <Cpu size={14} style={{ color: "var(--text-secondary)" }} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[12px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {node.name || <span style={{ color: "var(--text-secondary)" }}>Unnamed node</span>}
          </p>
          {isServerApp && (
            <span
              className="font-mono text-[9px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm shrink-0"
              style={{
                background: "color-mix(in srgb, var(--text-secondary) 10%, transparent)",
                color: "var(--text-secondary)",
                border: "1px solid color-mix(in srgb, var(--text-secondary) 20%, transparent)",
              }}
            >
              system
            </span>
          )}
        </div>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
          {node.id.slice(0, 8)} · {relativeTime(node.updatedAt)}
          {collaboratorOrgId && (
            <> · <span style={{ color: "var(--amber-primary)" }}>org {collaboratorOrgId.slice(0, 8)}</span></>
          )}
        </p>
        {metadata && <NodeMetadata metadata={metadata} />}
      </div>

      <Badge variant={nodeStatusVariant(node.status)} dot pulse={isActive}>
        {node.status}
      </Badge>

      {!isServerApp && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => deleteMutation.mutate(node.id)}
          disabled={deleteMutation.isPending}
          aria-label="Delete node"
        >
          <Trash2 size={13} />
        </Button>
      )}
    </div>
  );
}
