"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { settingsClient } from "@/features/settings/api/settings-client";
import { createRequestCache } from "@/lib/request-cache";
import type { CreateSettingInput, UpdateSettingInput } from "@/schemas/settings";
import type { SettingItem, SettingKind } from "@/types/settings";

const CACHE_TTL_MS = 15_000;
const cache = createRequestCache<{ items: SettingItem[] }>(CACHE_TTL_MS);

export function useSettingsCatalog(initialItems?: SettingItem[]) {
  const [items, setItems] = useState<SettingItem[]>(initialItems ?? []);
  const [isLoading, setIsLoading] = useState(initialItems === undefined);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(initialItems !== undefined);

  const load = useCallback(async () => {
    cache.clear();
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
    if (hydrated.current) {
      hydrated.current = false;
      return;
    }
    let cancelled = false;
    cache
      .get("settings", () => settingsClient.list())
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
    async (kind: SettingKind, category?: string) => {
      await settingsClient.seed(kind, category);
      await load();
    },
    [load],
  );

  return { items, isLoading, error, reload: load, create, update, remove, seed };
}
