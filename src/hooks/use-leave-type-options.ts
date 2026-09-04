"use client";

import { useEffect, useState } from "react";
import { leaveTypesClient } from "@/features/settings/api/leave-types-client";
import { createRequestCache } from "@/lib/request-cache";
import type { LeaveType } from "@/types/leave-type";

const CACHE_TTL_MS = 60_000;
const cache = createRequestCache<{ items: LeaveType[] }>(CACHE_TTL_MS);

function fetchLeaveTypes() {
  return cache.get("leave-types", () => leaveTypesClient.list());
}

export function useLeaveTypeOptions() {
  const [items, setItems] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLeaveTypes()
      .then((result) => {
        if (!cancelled) setItems(result.items);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, activeItems: items.filter((item) => item.active), isLoading };
}
