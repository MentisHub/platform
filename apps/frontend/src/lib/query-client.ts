import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (failureCount, error: unknown) => {
          if (
            error instanceof ApiError &&
            error.status < 500
          ) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        onError: (error) => {
          const message = error instanceof ApiError ? error.message : "Something went wrong";
          toast.error(message);
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
