"use client";

import type { ProjectResponse } from "@platform/contracts";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";

interface ProjectCardProps {
  project: ProjectResponse;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group relative flex flex-col rounded-md border overflow-hidden transition-all duration-150 hover:border-border-active"
      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, var(--amber-primary), transparent)",
          opacity: 0.3,
        }}
      />

      <div className="flex flex-col gap-3 p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className="font-display font-bold text-[14px] tracking-[0.01em] leading-snug"
            style={{ color: "var(--text-primary)" }}
          >
            {project.name}
          </p>
          <button
            onClick={(e) => e.preventDefault()}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-surface-2"
            style={{ color: "var(--text-secondary)" }}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
    </Link>
  );
}
