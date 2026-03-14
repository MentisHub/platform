import { QueryClient } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 min — avoids refetch on every mount
        retry: (failureCount, error: unknown) => {
          // Don't retry on 4xx client errors
          if (
            error instanceof Error &&
            "status" in error &&
            typeof (error as { status: number }).status === "number" &&
            (error as { status: number }).status < 500
          ) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
