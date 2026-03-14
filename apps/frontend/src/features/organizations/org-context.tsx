"use client";

import { createContext, useCallback, useContext, useState } from "react";

const STORAGE_KEY = "mentishub.orgId";

interface OrgContextValue {
  selectedOrgId: string | null;
  setSelectedOrgId: (id: string) => void;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null),
  );

  const setSelectedOrgId = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setSelectedOrgIdState(id);
  }, []);

  return (
    <OrgContext.Provider value={{ selectedOrgId, setSelectedOrgId }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrgContext() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrgContext must be used inside OrgProvider");
  return ctx;
}
