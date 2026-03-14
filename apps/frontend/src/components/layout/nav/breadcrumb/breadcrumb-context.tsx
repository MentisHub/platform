"use client";

import { createContext, useContext, useState, useMemo, useCallback, useId, useEffect } from "react";

export interface BreadcrumbItem {
  label?: string;
  href?: string;
  badge?: string;
  render?: React.ReactNode;
}

type CrumbMap = Map<string, BreadcrumbItem>;

interface BreadcrumbActions {
  registerCrumb: (id: string, item: BreadcrumbItem) => void;
  unregisterCrumb: (id: string) => void;
}

const BreadcrumbContext = createContext<CrumbMap>(new Map());
const BreadcrumbActionsContext = createContext<BreadcrumbActions>({
  registerCrumb: () => {},
  unregisterCrumb: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [crumbs, setCrumbs] = useState<CrumbMap>(new Map());

  const registerCrumb = useCallback((id: string, item: BreadcrumbItem) => {
    setCrumbs(prev => new Map(prev).set(id, item));
  }, []);

  const unregisterCrumb = useCallback((id: string) => {
    setCrumbs(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const actions = useMemo(
    () => ({ registerCrumb, unregisterCrumb }),
    [registerCrumb, unregisterCrumb],
  );

  return (
    <BreadcrumbActionsContext.Provider value={actions}>
      <BreadcrumbContext.Provider value={crumbs}>
        {children}
      </BreadcrumbContext.Provider>
    </BreadcrumbActionsContext.Provider>
  );
}

export function useBreadcrumb() {
  return useContext(BreadcrumbContext);
}

export function usePushCrumb(crumb: BreadcrumbItem | null) {
  const id = useId();
  const { registerCrumb, unregisterCrumb } = useContext(BreadcrumbActionsContext);

  useEffect(() => {
    if (!crumb) return;
    registerCrumb(id, crumb);
  }, [crumb, id, registerCrumb]);

  useEffect(() => {
    return () => unregisterCrumb(id);
  }, [id, unregisterCrumb]);
}
