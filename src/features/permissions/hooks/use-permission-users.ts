"use client";

import { useCallback, useEffect, useState } from "react";
import { usersClient } from "@/features/permissions/api/users-client";
import type { CreateUserInput, UpdateUserInput } from "@/schemas/user";
import type { AppUser } from "@/types/user";

export function usePermissionUsers() {
  const [items, setItems] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
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
    let cancelled = false;
    usersClient
      .list()
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
