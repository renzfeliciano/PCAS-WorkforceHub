"use client";

import { useCallback, useEffect, useState } from "react";
import { settingsClient } from "@/features/settings/api/settings-client";
import type { CreateSettingInput, UpdateSettingInput } from "@/schemas/settings";
import type { SettingItem, SettingKind } from "@/types/settings";

export function useSettingsCatalog() {
  const [items, setItems] = useState<SettingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await settingsClient.list();
      setItems(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    settingsClient
      .list()
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load settings");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const create = useCallback(
    async (input: CreateSettingInput) => {
      const item = await settingsClient.create(input);
      await load();
      return item;
    },
    [load],
  );
  const update = useCallback(
    async (id: string, input: UpdateSettingInput) => {
      const item = await settingsClient.update(id, input);
      await load();
      return item;
    },
    [load],
  );
  const remove = useCallback(
    async (id: string) => {
      await settingsClient.delete(id);
      await load();
    },
    [load],
  );
  const seed = useCallback(
    async (kind: SettingKind) => {
      await settingsClient.seed(kind);
      await load();
    },
    [load],
  );

  return { items, isLoading, error, reload: load, create, update, remove, seed };
}
