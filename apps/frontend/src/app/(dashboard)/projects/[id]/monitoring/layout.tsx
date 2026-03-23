"use client";

import { usePushCrumb } from "@/components/layout/nav/breadcrumb/breadcrumb-context";
import { use } from "react";

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function MonitoringLayout({ children, params }: Props) {
  const { id } = use(params);
  usePushCrumb({ label: "Runs", href: `/projects/${id}/runs` });
  return <>{children}</>;
}
