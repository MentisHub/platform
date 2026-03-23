"use client";

import { Sidebar, type NavItemDef } from "@/components/layout/nav/sidebar";
import { Activity, Cpu, LayoutDashboard, Package, Play } from "lucide-react";
import { useParams } from "next/navigation";

export default function ProjectSidebarSlot() {
  const { id } = useParams<{ id: string }>();

  const isActive = (href: string, pathname: string) =>
    href === `/projects/${id}` ? pathname === href : pathname.startsWith(href);

  const navItems: NavItemDef[] = [
    { href: `/projects/${id}`, icon: LayoutDashboard, label: "Overview" },
    { href: `/projects/${id}/runs`, icon: Play, label: "Runs" },
    { href: `/projects/${id}/nodes`, icon: Cpu, label: "Nodes" },
    { href: `/projects/${id}/fabs`, icon: Package, label: "FABs" },
    { href: `/projects/${id}/monitoring`, icon: Activity, label: "Monitoring" },
  ];

  return (
    <Sidebar
      navItems={navItems}
      settingsHref={`/projects/${id}/settings`}
      isActive={isActive}
    />
  );
}
