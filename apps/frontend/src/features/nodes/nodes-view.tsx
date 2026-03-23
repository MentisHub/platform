"use client";

import { useState } from "react";
import { usePushCrumb } from "@/components/layout/nav/breadcrumb/breadcrumb-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useNodes } from "./queries";
import { useCurrentOrg } from "@/features/organizations/use-current-org";
import { CreateNodeDialog } from "./components/create-node-dialog";
import { NodeRow } from "./components/node-row";
import { NodeGroup } from "./components/node-group";
import { getPageNumbers } from "@/lib/utils";
import { Cpu, Plus } from "lucide-react";

const PAGE_SIZE = 10;

interface NodesViewProps {
  projectId: string;
}

export function NodesView({ projectId }: NodesViewProps) {
  usePushCrumb({ label: "Nodes" });

  const { org } = useCurrentOrg();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNodes(org?.id ?? "", {
    projectId,
    page,
    limit: PAGE_SIZE,
  });

  const nodes = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  const serverApps = nodes.filter((n) => n.name?.startsWith("serverapp-"));
  const clientNodes = nodes.filter((n) => !n.name?.startsWith("serverapp-"));
  const projectNodes = clientNodes.filter(
    (n) => n.organizationId === org?.id && n.projectId === projectId,
  );
  const orgNodes = clientNodes.filter(
    (n) => n.organizationId === org?.id && n.projectId !== projectId,
  );
  const collaboratorNodes = clientNodes.filter(
    (n) => n.organizationId !== org?.id,
  );

  const readyCount = nodes.filter((n) => n.status === "READY").length;

  return (
    <>
      <Header title="Nodes">
        {org && (
          <CreateNodeDialog projectId={projectId}>
            <Button size="sm">
              <Plus size={11} />
              Add Node
            </Button>
          </CreateNodeDialog>
        )}
      </Header>

      <div className="flex-1 p-5 flex flex-col gap-3 min-h-0 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[58px] w-full" />
            ))}
          </div>
        )}

        {!isLoading && nodes.length === 0 && (
          <EmptyState
            icon={Cpu}
            title="No nodes yet"
            description="Add a node to this project to participate in training"
            action={
              org && (
                <CreateNodeDialog projectId={projectId}>
                  <Button variant="outline">Add First Node →</Button>
                </CreateNodeDialog>
              )
            }
          />
        )}

        {!isLoading && nodes.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-[10px] tracking-[0.06em] uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                {data?.meta.total ?? nodes.length} node
                {(data?.meta.total ?? nodes.length) !== 1 ? "s" : ""}
              </span>
              {readyCount > 0 && (
                <Badge variant="success" dot>
                  {readyCount} ready
                </Badge>
              )}
            </div>

            {projectNodes.length > 0 && (
              <NodeGroup label={`This project · ${projectNodes.length}`}>
                {projectNodes.map((node) => (
                  <NodeRow key={node.id} node={node} orgId={org?.id ?? ""} />
                ))}
              </NodeGroup>
            )}

            {orgNodes.length > 0 && (
              <NodeGroup label={`Organization · ${orgNodes.length}`}>
                {orgNodes.map((node) => (
                  <NodeRow key={node.id} node={node} orgId={org?.id ?? ""} />
                ))}
              </NodeGroup>
            )}

            {collaboratorNodes.length > 0 && (
              <NodeGroup
                label={`Collaborating organizations · ${collaboratorNodes.length}`}
              >
                {collaboratorNodes.map((node) => (
                  <NodeRow
                    key={node.id}
                    node={node}
                    orgId={org?.id ?? ""}
                    collaboratorOrgId={node.organizationId}
                  />
                ))}
              </NodeGroup>
            )}

            {serverApps.length > 0 && (
              <NodeGroup label={`Server apps · ${serverApps.length}`}>
                {serverApps.map((node) => (
                  <NodeRow
                    key={node.id}
                    node={node}
                    orgId={org?.id ?? ""}
                    isServerApp
                  />
                ))}
              </NodeGroup>
            )}

            {totalPages > 1 && (
              <div className="mt-2">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage((p) => Math.max(1, p - 1));
                        }}
                        aria-disabled={page === 1}
                        className={
                          page === 1 ? "pointer-events-none opacity-40" : ""
                        }
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
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(p);
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage((p) => Math.min(totalPages, p + 1));
                        }}
                        aria-disabled={page === totalPages}
                        className={
                          page === totalPages
                            ? "pointer-events-none opacity-40"
                            : ""
                        }
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
