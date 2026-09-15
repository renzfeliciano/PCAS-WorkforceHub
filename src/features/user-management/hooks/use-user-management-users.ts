"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usersClient } from "@/features/user-management/api/users-client";
import type { UserListParams } from "@/features/user-management/api/users-client";
import { createRequestCache } from "@/lib/request-cache";
import type { CreateUserInput, UpdateUserInput } from "@/schemas/user";
import type { AppUser } from "@/types/user";

export type UserListInitialData = { items: AppUser[]; total: number };

// Same standard as useEmployees: filter changes are debounced and the
// previous in-flight request is aborted, so rapid typing collapses into one
// request instead of hammering the API.
const FILTER_DEBOUNCE_MS = 300;
const CACHE_TTL_MS = 15_000;
const cache = createRequestCache<{ items: AppUser[]; total: number }>(CACHE_TTL_MS);

export function useUserManagementUsers(
  { page, pageSize, sortBy, sortDir, query, role, status }: UserListParams,
  initialData?: UserListInitialData,
) {
  const [items, setItems] = useState<AppUser[]>(initialData?.items ?? []);
  const [total, setTotal] = useState(initialData?.total ?? 0);
  const [isLoading, setIsLoading] = useState(initialData === undefined);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(initialData !== undefined);

  const load = useCallback(async () => {
    cache.clear();
    const controller = new AbortController();
    setIsFetching(true);
    try {
      const result = await usersClient.list(
        { page, pageSize, sortBy, sortDir, query, role, status },
        controller.signal,
      );
      setItems(result.items);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [page, pageSize, sortBy, sortDir, query, role, status]);

  useEffect(() => {
    if (hydrated.current) {
      hydrated.current = false;
      return;
    }
    const controller = new AbortController();
    setIsFetching(true);
    const timeoutId = setTimeout(() => {
      cache
        .get(JSON.stringify({ page, pageSize, sortBy, sortDir, query, role, status }), () =>
          usersClient.list({ page, pageSize, sortBy, sortDir, query, role, status }, controller.signal),
        )
        .then((result) => {
          setItems(result.items);
          setTotal(result.total);
          setError(null);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Failed to load users");
        })
        .finally(() => {
          setIsLoading(false);
          setIsFetching(false);
        });
    }, FILTER_DEBOUNCE_MS);
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [page, pageSize, sortBy, sortDir, query, role, status]);

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

  return { items, total, isLoading, isFetching, error, reload: load, create, update, deactivate };
}
