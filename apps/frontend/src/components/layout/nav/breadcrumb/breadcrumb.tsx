"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "./breadcrumb-context";
import { useBreadcrumb } from "./breadcrumb-context";

export function Sep() {
  return <ChevronRight size={12} style={{ color: "var(--border-active)" }} className="shrink-0" />;
}

export function Crumb({ label, href, badge }: Omit<BreadcrumbItem, "render">) {
  const inner = (
    <span className="flex items-center gap-1.5 h-7 px-2 rounded-sm hover:bg-surface-2 transition-colors">
      <span
        className="font-mono text-[11px] tracking-[0.04em]"
        style={{ color: "var(--text-primary)" }}
      >
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
    </span>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function BreadcrumbTrail() {
  const crumbs = useBreadcrumb();
  const items = useMemo(() => Array.from(crumbs.entries()), [crumbs]);
  return (
    <>
      {items.map(([id, crumb], i) => (
        <div key={id} className="flex items-center gap-1 min-w-0">
          {i > 0 && <Sep />}
          {crumb.render ?? <Crumb label={crumb.label} href={crumb.href} badge={crumb.badge} />}
        </div>
      ))}
    </>
  );
}
