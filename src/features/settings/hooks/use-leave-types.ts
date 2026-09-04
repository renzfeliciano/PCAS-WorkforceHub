"use client";

import { useCallback, useEffect, useState } from "react";
import { leaveTypesClient } from "@/features/settings/api/leave-types-client";
import type { CreateLeaveTypeInput, UpdateLeaveTypeInput } from "@/schemas/leave-type";
import type { LeaveType } from "@/types/leave-type";

export function useLeaveTypes() {
  const [items, setItems] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await leaveTypesClient.list();
      setItems(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leave types");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    leaveTypesClient
      .list()
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load leave types");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const create = useCallback(
    async (input: CreateLeaveTypeInput) => {
      const item = await leaveTypesClient.create(input);
      await load();
      return item;
    },
    [load],
  );
  const update = useCallback(
    async (id: string, input: UpdateLeaveTypeInput) => {
      const item = await leaveTypesClient.update(id, input);
      await load();
      return item;
    },
    [load],
  );
  const remove = useCallback(
    async (id: string) => {
      await leaveTypesClient.delete(id);
      await load();
    },
    [load],
  );

  return { items, isLoading, error, reload: load, create, update, remove };
}
