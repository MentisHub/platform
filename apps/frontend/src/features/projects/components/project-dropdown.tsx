"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Search, Plus, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrentOrg } from "@/features/organizations/use-current-org";
import { useProjects } from "@/features/projects/queries";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectResponse } from "@platform/contracts";
import { useDebounce } from "@/hooks/use-debounce";

export function ProjectDropdown({ projectId, label, badge }: { projectId: string; label: string; badge?: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const router = useRouter();
  const { org } = useCurrentOrg();
  const { data, isLoading } = useProjects(org?.id, { search: debouncedSearch });
  const ref = useRef<HTMLDivElement>(null);

  const projects: ProjectResponse[] = data?.data ?? [];

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 h-7 px-2 rounded-sm transition-colors hover:bg-surface-2 group"
      >
        <span className="font-mono text-[11px] tracking-[0.04em]" style={{ color: "var(--text-primary)" }}>
          {label}
        </span>
        {badge && (
          <span
            className="font-mono text-[9px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded-sm"
            style={{
              background: "color-mix(in srgb, var(--amber-primary) 12%, transparent)",
              color: "var(--amber-primary)",
              border: "1px solid color-mix(in srgb, var(--amber-primary) 25%, transparent)",
            }}
          >
            {badge}
          </span>
        )}
        <ChevronsUpDown
          size={10}
          className="opacity-80 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--text-secondary)" }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-56 rounded-sm shadow-lg z-50 overflow-hidden"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border-active)" }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2 border-b"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <Search size={10} style={{ color: "var(--text-secondary)" }} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find project..."
              className="flex-1 bg-transparent outline-none font-mono text-[11px] tracking-[0.04em] placeholder:text-text-secondary"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          <div className="py-1 max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col gap-2 px-3 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-full" />
                ))}
              </div>
            ) : (
              projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { router.push(`/projects/${p.id}`); setOpen(false); setSearch(""); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 transition-colors text-left hover:bg-surface-3"
                >
                  <span
                    className="flex-1 font-mono text-[11px] tracking-[0.04em] truncate"
                    style={{ color: p.id === projectId ? "var(--text-primary)" : "var(--text-secondary)" }}
                  >
                    {p.name}
                  </span>
                  {p.id === projectId && <Check size={10} style={{ color: "var(--amber-primary)" }} />}
                </button>
              ))
            )}
          </div>

          <div className="border-t py-1" style={{ borderColor: "var(--border-subtle)" }}>
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-surface-3"
              onClick={() => setOpen(false)}
            >
              <div
                className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0"
                style={{ border: "1px dashed var(--border-active)" }}
              >
                <Plus size={8} style={{ color: "var(--text-secondary)" }} />
              </div>
              <span className="font-mono text-[11px] tracking-[0.04em]" style={{ color: "var(--text-secondary)" }}>
                New project
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
