"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { leaveTypesClient } from "@/features/settings/api/leave-types-client";
import { createRequestCache } from "@/lib/request-cache";
import type { CreateLeaveTypeInput, UpdateLeaveTypeInput } from "@/schemas/leave-type";
import type { LeaveType } from "@/types/leave-type";

const CACHE_TTL_MS = 15_000;
const cache = createRequestCache<{ items: LeaveType[] }>(CACHE_TTL_MS);

export function useLeaveTypes(initialItems?: LeaveType[]) {
  const [items, setItems] = useState<LeaveType[]>(initialItems ?? []);
  const [isLoading, setIsLoading] = useState(initialItems === undefined);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(initialItems !== undefined);

  const load = useCallback(async () => {
    cache.clear();
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
    if (hydrated.current) {
      hydrated.current = false;
      return;
    }
    let cancelled = false;
    cache
      .get("leave-types", () => leaveTypesClient.list())
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
  const seed = useCallback(async () => {
    await leaveTypesClient.seed();
    await load();
  }, [load]);

  return { items, isLoading, error, reload: load, create, update, remove, seed };
}
