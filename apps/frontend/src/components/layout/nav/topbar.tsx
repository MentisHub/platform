"use client";

import Image from "next/image";
import Link from "next/link";
import { BreadcrumbTrail } from "./breadcrumb/breadcrumb";
import {
  usePushCrumb,
  type BreadcrumbItem,
} from "./breadcrumb/breadcrumb-context";
import { OrgDropdown } from "@/features/organizations/org-dropdown";
import { ThemeToggle } from "./theme-toggle";

const ORG_CRUMB: BreadcrumbItem = { render: <OrgDropdown /> };

export function Topbar() {
  usePushCrumb(ORG_CRUMB);

  return (
    <header
      className="fixed top-0 left-0 right-0 h-10 flex items-center z-30 border-b border-border-subtle"
      style={{ background: "var(--surface-1)" }}
    >
      <Link
        href="/"
        className="w-14 h-10 flex items-center justify-center shrink-0 border-r border-border-subtle hover:bg-surface-2 transition-colors"
      >
        <Image
          src="/mentishub-icon.svg"
          alt="MentisHub Icon"
          width={38}
          height={38}
        />
      </Link>

      <div className="flex items-center gap-1 flex-1 min-w-0 px-3">
        <BreadcrumbTrail />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <ThemeToggle />
      </div>
    </header>
  );
}
