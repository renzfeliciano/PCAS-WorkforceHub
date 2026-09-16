"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { catalogClient } from "@/features/settings/api/catalog-client";
import { createRequestCache } from "@/lib/request-cache";
import type { CreateCatalogInput, UpdateCatalogInput } from "@/schemas/catalog";
import type { CatalogItem, CatalogKind } from "@/types/catalog";

const CACHE_TTL_MS = 15_000;
const cache = createRequestCache<{ items: CatalogItem[] }>(CACHE_TTL_MS);

export function useCatalog(initialItems?: CatalogItem[]) {
  const [items, setItems] = useState<CatalogItem[]>(initialItems ?? []);
  const [isLoading, setIsLoading] = useState(initialItems === undefined);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(initialItems !== undefined);

  const load = useCallback(async () => {
    cache.clear();
    try {
      const result = await catalogClient.list();
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
      .get("catalog", () => catalogClient.list())
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
    async (input: CreateCatalogInput) => {
      const item = await catalogClient.create(input);
      await load();
      return item;
    },
    [load],
  );
  const update = useCallback(
    async (id: string, input: UpdateCatalogInput) => {
      const item = await catalogClient.update(id, input);
      await load();
      return item;
    },
    [load],
  );
  const remove = useCallback(
    async (id: string) => {
      await catalogClient.delete(id);
      await load();
    },
    [load],
  );
  const seed = useCallback(
    async (kind: CatalogKind, category?: string) => {
      await catalogClient.seed(kind, category);
      await load();
    },
    [load],
  );

  return { items, isLoading, error, reload: load, create, update, remove, seed };
}
