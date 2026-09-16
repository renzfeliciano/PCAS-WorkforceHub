"use client";

import { useEffect, useState } from "react";
import { catalogClient } from "@/features/settings/api/catalog-client";
import { createRequestCache } from "@/lib/request-cache";
import type { CatalogItem, CatalogKind } from "@/types/catalog";

const CACHE_TTL_MS = 60_000;
const cache = createRequestCache<{ items: CatalogItem[] }>(CACHE_TTL_MS);

function fetchCatalog(kind: CatalogKind, category?: string) {
  return cache.get(`${kind}:${category ?? ""}`, () => catalogClient.list({ kind, category }));
}

export function useCatalogOptions(kind: CatalogKind, category?: string) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCatalog(kind, category)
      .then((result) => {
        if (!cancelled) setItems(result.items);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, category]);

  return { items, activeItems: items.filter((item) => item.active), isLoading };
}
