"use client";

import { useEffect, useRef, useState } from "react";
import { dashboardClient } from "@/features/dashboard/api/dashboard-client";
import { createRequestCache } from "@/lib/request-cache";
import type { DashboardSummary } from "@/services/dashboard-service";

const CACHE_TTL_MS = 15_000;
const cache = createRequestCache<DashboardSummary>(CACHE_TTL_MS);

export function useDashboardSummary(initialData?: DashboardSummary) {
  const [data, setData] = useState<DashboardSummary | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(initialData === undefined);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(initialData !== undefined);

  useEffect(() => {
    if (hydrated.current) {
      hydrated.current = false;
      return;
    }
    let cancelled = false;
    cache
      .get("summary", () => dashboardClient.summary())
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}
