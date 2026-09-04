"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usersClient } from "@/features/permissions/api/users-client";
import type { UserListParams } from "@/features/permissions/api/users-client";
import { createRequestCache } from "@/lib/request-cache";
import type { CreateUserInput, UpdateUserInput } from "@/schemas/user";
import type { AppUser } from "@/types/user";

export type UserListInitialData = { items: AppUser[]; total: number };

const CACHE_TTL_MS = 15_000;
const cache = createRequestCache<{ items: AppUser[]; total: number }>(CACHE_TTL_MS);

export function usePermissionUsers(
  { page, pageSize, sortBy, sortDir }: UserListParams,
  initialData?: UserListInitialData,
) {
  const [items, setItems] = useState<AppUser[]>(initialData?.items ?? []);
  const [total, setTotal] = useState(initialData?.total ?? 0);
  const [isLoading, setIsLoading] = useState(initialData === undefined);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(initialData !== undefined);

  const load = useCallback(async () => {
    cache.clear();
    try {
      const result = await usersClient.list({ page, pageSize, sortBy, sortDir });
      setItems(result.items);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sortBy, sortDir]);

  useEffect(() => {
    if (hydrated.current) {
      hydrated.current = false;
      return;
    }
    let cancelled = false;
    cache
      .get(JSON.stringify({ page, pageSize, sortBy, sortDir }), () =>
        usersClient.list({ page, pageSize, sortBy, sortDir }),
      )
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load users");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, sortBy, sortDir]);

  const create = useCallback(
    async (input: CreateUserInput) => {
      const user = await usersClient.create(input);
      await load();
      return user;
    },
    [load],
  );
  const update = useCallback(
    async (id: string, input: UpdateUserInput) => {
      const user = await usersClient.update(id, input);
      await load();
      return user;
    },
    [load],
  );
  const deactivate = useCallback(
    async (id: string) => {
      await usersClient.deactivate(id);
      await load();
    },
    [load],
  );

  return { items, total, isLoading, error, reload: load, create, update, deactivate };
}
