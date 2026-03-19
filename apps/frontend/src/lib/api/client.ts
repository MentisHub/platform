export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { createClient } = await import("@/lib/supabase/client");
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? null;
}

type Params = Record<string, string | number | boolean | undefined | null>;

async function request<T>(
  path: string,
  init: RequestInit = {},
  params?: Params,
): Promise<T> {
  const token = await getToken();

  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v != null) url.searchParams.set(k, String(v));
    });
  }

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url.toString(), { ...init, headers });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      payload.message ?? res.statusText,
      payload.code,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, params?: Params) =>
    request<T>(path, { method: "GET" }, params),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T = void>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};
