"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Check, Search, Plus, Building2, ChevronsUpDown } from "lucide-react";
import { useOrganizations } from "@/features/organizations/queries";
import { useRouter } from "next/navigation";
import { useOrgContext } from "@/features/organizations/org-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrganizationResponse } from "@platform/contracts";

export function OrgDropdown() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const debouncedSearch = useDebounce(inputValue || undefined, 300);
  const { selectedOrgId, setSelectedOrgId } = useOrgContext();
  const { data, isLoading } = useOrganizations({ search: debouncedSearch });
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const orgs: OrganizationResponse[] = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => {
    if (!selectedOrgId && orgs.length > 0) setSelectedOrgId(orgs[0].id);
  }, [orgs, selectedOrgId, setSelectedOrgId]);

  const currentOrg = orgs.find((o) => o.id === selectedOrgId) ?? orgs[0] ?? null;

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setInputValue("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-7 px-2 rounded-sm transition-colors hover:bg-surface-2 group"
      >
        {isLoading && !currentOrg ? (
          <Skeleton className="h-3 w-20" />
        ) : currentOrg ? (
          <>
            <div
              className="w-4 h-4 rounded-sm flex items-center justify-center font-mono font-bold text-[9px] shrink-0"
              style={{ background: "var(--amber-primary)", color: "#fff8ee" }}
            >
              {currentOrg.name.charAt(0).toUpperCase()}
            </div>
            <span
              className="font-mono text-[11px] tracking-[0.04em] max-w-[120px] truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {currentOrg.name}
            </span>
          </>
        ) : (
          <Building2 size={13} style={{ color: "var(--text-secondary)" }} />
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
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-active)",
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2 border-b"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <Search size={10} style={{ color: "var(--text-secondary)" }} />
            <input
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Find organization..."
              className="flex-1 bg-transparent outline-none font-mono text-[11px] tracking-[0.04em] placeholder:text-text-secondary"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          <div className="py-1 max-h-48 overflow-y-auto">
            {orgs.map((org) => {
              const active = org.id === (selectedOrgId ?? orgs[0]?.id);
              return (
                <button
                  key={org.id}
                  onClick={() => {
                    setSelectedOrgId(org.id);
                    setOpen(false);
                    setInputValue("");

                    if (window.location.pathname.startsWith("/projects/")) {
                      router.push("/");
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 transition-colors text-left hover:bg-surface-3"
                >
                  <div
                    className="w-4 h-4 rounded-sm flex items-center justify-center font-mono font-bold text-[9px] shrink-0"
                    style={{ background: "var(--amber-primary)", color: "#fff8ee" }}
                  >
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className="flex-1 font-mono text-[11px] tracking-[0.04em] truncate"
                    style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}
                  >
                    {org.name}
                  </span>
                  {active && <Check size={10} style={{ color: "var(--amber-primary)" }} />}
                </button>
              );
            })}
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
                New organization
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
