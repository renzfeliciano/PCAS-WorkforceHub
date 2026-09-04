"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usersClient } from "@/features/permissions/api/users-client";
import { createRequestCache } from "@/lib/request-cache";
import type { CreateUserInput, UpdateUserInput } from "@/schemas/user";
import type { AppUser } from "@/types/user";

const CACHE_TTL_MS = 15_000;
const cache = createRequestCache<{ items: AppUser[] }>(CACHE_TTL_MS);

export function usePermissionUsers(initialItems?: AppUser[]) {
  const [items, setItems] = useState<AppUser[]>(initialItems ?? []);
  const [isLoading, setIsLoading] = useState(initialItems === undefined);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(initialItems !== undefined);

  const load = useCallback(async () => {
    cache.clear();
    try {
      const result = await usersClient.list();
      setItems(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
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
      .get("users", () => usersClient.list())
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
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
  }, []);

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

  return { items, isLoading, error, reload: load, create, update, deactivate };
}
