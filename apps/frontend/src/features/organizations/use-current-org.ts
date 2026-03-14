"use client";

import { useEffect, useMemo } from "react";
import { useOrganizations } from "./queries";
import { useOrgContext } from "./org-context";
import { OrganizationResponse } from "@platform/contracts";

export function useCurrentOrg() {
  const { data, isLoading, isError } = useOrganizations();
  const { selectedOrgId, setSelectedOrgId } = useOrgContext();

  const orgs: OrganizationResponse[] = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => {
    if (!selectedOrgId && orgs.length > 0) {
      setSelectedOrgId(orgs[0].id);
    }
  }, [orgs, selectedOrgId, setSelectedOrgId]);

  const org = orgs.find((o) => o.id === selectedOrgId) ?? orgs[0] ?? null;

  return { org, isLoading, isError };
}
