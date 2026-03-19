"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MetricsStreamEvent } from "@platform/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";

export function useMetricsStream(projectId: string, trainingRunId?: string) {
  const [event, setEvent] = useState<MetricsStreamEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const ctrl = new AbortController();

    async function connect() {
      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token || !mountedRef.current) return;

      const url = new URL(`${API_BASE}/projects/${projectId}/metrics/stream`);
      if (trainingRunId) url.searchParams.set("trainingRunId", trainingRunId);

      try {
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          if (mountedRef.current) setError(`HTTP ${res.status}`);
          return;
        }

        if (mountedRef.current) {
          setConnected(true);
          setError(null);
        }

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buf = "";

        while (mountedRef.current) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += value;
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.slice(6)) as MetricsStreamEvent;
                if (mountedRef.current) setEvent(parsed);
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (mountedRef.current) setError("Stream disconnected");
      } finally {
        if (mountedRef.current) setConnected(false);
      }
    }

    void connect();

    return () => {
      mountedRef.current = false;
      ctrl.abort();
    };
  }, [projectId, trainingRunId]);

  return { event, connected, error };
}
