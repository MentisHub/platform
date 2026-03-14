"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItemDef {
  href: string;
  icon: React.ElementType;
  label: string;
}

const tooltipStyle = {
  background: "var(--surface-3)",
  color: "var(--text-primary)",
  border: "1px solid var(--border-subtle)",
} as const;

const NavItem = memo(function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "group relative w-10 h-10 flex items-center justify-center rounded-sm transition-colors duration-150",
        active
          ? "bg-amber-primary/10 text-amber-primary"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
      )}
    >
      <Icon size={17} strokeWidth={active ? 2 : 1.5} />

      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
          style={{ background: "var(--amber-primary)" }}
        />
      )}

      <span
        className="absolute left-14 px-2.5 py-1 rounded-sm font-mono text-[10px] tracking-widest uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-100 z-50"
        style={tooltipStyle}
      >
        {label}
      </span>
    </Link>
  );
});

export interface SidebarProps {
  navItems: NavItemDef[];
  settingsHref: string;
  isActive: (href: string, pathname: string) => boolean;
  header?: React.ReactNode;
}

export function Sidebar({ navItems, settingsHref, isActive, header }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-10 bottom-0 w-14 flex flex-col items-center py-3 gap-1 z-40 border-r border-border-subtle"
      style={{ background: "var(--surface-1)" }}
    >
      {header}

      <nav className="flex flex-col items-center gap-1 flex-1">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isActive(item.href, pathname)}
          />
        ))}
      </nav>

      <div className="flex flex-col items-center gap-1">
        <Link
          href={settingsHref}
          title="Settings"
          className="w-10 h-10 flex items-center justify-center rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors duration-150"
        >
          <Settings size={17} strokeWidth={1.5} />
        </Link>

        <button
          title="User"
          className="w-10 h-10 flex items-center justify-center rounded-sm hover:bg-surface-2 transition-colors duration-150"
        >
          <div
            className="w-6 h-6 rounded-sm flex items-center justify-center font-mono text-[10px] font-bold"
            style={{ background: "var(--amber-primary)", color: "#fff8ee" }}
          >
            U
          </div>
        </button>
      </div>
    </aside>
  );
}
