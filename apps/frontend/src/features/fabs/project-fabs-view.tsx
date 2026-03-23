"use client";

import { useState, useCallback } from "react";
import { usePushCrumb } from "@/components/layout/nav/breadcrumb/breadcrumb-context";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useFabs } from "./queries";
import { useCurrentOrg } from "@/features/organizations/use-current-org";
import { FabRow } from "./components/fab-row";
import { FabGroup } from "./components/fab-group";
import { getPageNumbers } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { Package, Search, X } from "lucide-react";

const PAGE_SIZE = 20;

interface ProjectFabsViewProps {
  projectId: string;
}

export function ProjectFabsView({ projectId }: ProjectFabsViewProps) {
  usePushCrumb({ label: "FABs" });

  const { org } = useCurrentOrg();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useFabs(org?.id ?? "", {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    tags: activeTags.length > 0 ? activeTags : undefined,
  });

  const fabs = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  const projectFabs = fabs.filter((f) => f.organizationId === org?.id && f.projectId === projectId);
  const orgFabs = fabs.filter((f) => f.organizationId === org?.id && f.projectId !== projectId);
  const publicFabs = fabs.filter((f) => !f.isDefault && f.isPublic && f.organizationId !== org?.id);
  const globalFabs = fabs.filter((f) => f.isDefault);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const addTag = useCallback((tag: string) => {
    setActiveTags((prev) => prev.includes(tag) ? prev : [...prev, tag]);
    setPage(1);
  }, []);

  const removeTag = (tag: string) => {
    setActiveTags((prev) => prev.filter((t) => t !== tag));
    setPage(1);
  };

  const hasFilters = search || activeTags.length > 0;

  return (
    <>
      <Header title="FABs">
        <span
          className="font-mono text-[10px] tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          {!isLoading && data ? `${data.meta.total} available` : ""}
        </span>
      </Header>

      <div className="flex-1 p-5 flex flex-col gap-3 min-h-0 overflow-y-auto">
        {/* Search bar */}
        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-2 h-8 px-3 rounded-sm border"
            style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
          >
            <Search size={11} style={{ color: "var(--text-secondary)" }} />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name…"
              className="flex-1 bg-transparent outline-none font-mono text-[11px] tracking-[0.04em] placeholder:text-text-secondary"
              style={{ color: "var(--text-primary)" }}
            />
            {search && (
              <button onClick={() => handleSearchChange("")}>
                <X size={11} style={{ color: "var(--text-secondary)" }} />
              </button>
            )}
          </div>

          {activeTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => removeTag(tag)}
                  className="flex items-center gap-1 font-mono text-[9px] tracking-[0.06em] px-1.5 py-0.5 rounded-sm transition-opacity hover:opacity-70"
                  style={{
                    background: "color-mix(in srgb, var(--amber-primary) 15%, transparent)",
                    color: "var(--amber-primary)",
                    border: "1px solid color-mix(in srgb, var(--amber-primary) 30%, transparent)",
                  }}
                >
                  {tag}
                  <X size={8} />
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[66px] w-full" />
            ))}
          </div>
        )}

        {!isLoading && fabs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Package size={32} style={{ color: "var(--border-active)" }} strokeWidth={1} />
            <div className="text-center">
              <p className="font-display font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>
                {hasFilters ? "No FABs match your search" : "No FABs available"}
              </p>
              <p className="font-mono text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>
                {hasFilters
                  ? "Try adjusting your search or clearing the filters"
                  : "Upload a Federated Application Bundle to your organization first"}
              </p>
            </div>
          </div>
        )}

        {!isLoading && fabs.length > 0 && (
          <>
            {projectFabs.length > 0 && (
              <FabGroup label={`This project · ${projectFabs.length}`}>
                {projectFabs.map((fab) => (
                  <FabRow key={fab.id} fab={fab} orgId={org?.id ?? ""} onTagClick={addTag} />
                ))}
              </FabGroup>
            )}

            {orgFabs.length > 0 && (
              <FabGroup label={`Organization · ${orgFabs.length}`}>
                {orgFabs.map((fab) => (
                  <FabRow key={fab.id} fab={fab} orgId={org?.id ?? ""} onTagClick={addTag} />
                ))}
              </FabGroup>
            )}

            {publicFabs.length > 0 && (
              <FabGroup label={`Public · ${publicFabs.length}`}>
                {publicFabs.map((fab) => (
                  <FabRow key={fab.id} fab={fab} orgId={org?.id ?? ""} onTagClick={addTag} />
                ))}
              </FabGroup>
            )}

            {globalFabs.length > 0 && (
              <FabGroup label={`Global · ${globalFabs.length}`}>
                {globalFabs.map((fab) => (
                  <FabRow key={fab.id} fab={fab} orgId={org?.id ?? ""} onTagClick={addTag} />
                ))}
              </FabGroup>
            )}

            {totalPages > 1 && (
              <div className="mt-2">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                        aria-disabled={page === 1}
                        className={page === 1 ? "pointer-events-none opacity-40" : ""}
                      />
                    </PaginationItem>

                    {getPageNumbers(page, totalPages).map((p, i) =>
                      p === "…" ? (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={p === page}
                            onClick={(e) => { e.preventDefault(); setPage(p); }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                        aria-disabled={page === totalPages}
                        className={page === totalPages ? "pointer-events-none opacity-40" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
