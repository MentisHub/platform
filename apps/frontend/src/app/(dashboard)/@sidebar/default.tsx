"use client";

import { Activity, Layers, Package, Server } from "lucide-react";
import { Sidebar, type NavItemDef } from "@/components/layout/nav/sidebar";

const navItems: NavItemDef[] = [
  { href: "/", icon: Layers, label: "Projects" },
  { href: "/nodes", icon: Server, label: "Nodes" },
  { href: "/fabs", icon: Package, label: "FABs" },
  { href: "/monitoring", icon: Activity, label: "Monitoring" },
];

const isActive = (href: string, pathname: string) => pathname === href;

export default function DefaultSidebar() {
  return <Sidebar navItems={navItems} settingsHref="/settings" isActive={isActive} />;
}
