import { QueryClient, QueryCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        const message = error instanceof ApiError ? error.message : "Something went wrong";
        toast.error(message, { id: "query-error" });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: false,
      },
      mutations: {
        onError: (error) => {
          const message = error instanceof ApiError ? error.message : "Something went wrong";
          toast.error(message, { id: "query-error" });
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
