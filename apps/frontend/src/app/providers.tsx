"use client";

import { BreadcrumbProvider } from "@/components/layout/nav/breadcrumb/breadcrumb-context";
import { OrgProvider } from "@/features/organizations/org-context";
import { getQueryClient } from "@/lib/query-client";
import { Toaster } from "@/components/ui/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
      >
        <OrgProvider>
          <BreadcrumbProvider>
            {children}
          </BreadcrumbProvider>
        </OrgProvider>
      </ThemeProvider>

      <Toaster richColors position="bottom-right" />

      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
