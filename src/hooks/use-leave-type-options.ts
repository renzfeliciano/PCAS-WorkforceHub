"use client";

import { useEffect, useState } from "react";
import { leaveTypesClient } from "@/features/settings/api/leave-types-client";
import type { LeaveType } from "@/types/leave-type";

export function useLeaveTypeOptions() {
  const [items, setItems] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    leaveTypesClient
      .list()
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
