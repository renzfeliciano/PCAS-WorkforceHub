"use client";

import { useEffect, useState } from "react";
import { settingsClient } from "@/features/settings/api/settings-client";
import { createRequestCache } from "@/lib/request-cache";
import type { SettingItem, SettingKind } from "@/types/settings";

const CACHE_TTL_MS = 60_000;
const cache = createRequestCache<{ items: SettingItem[] }>(CACHE_TTL_MS);

function fetchCatalog(kind: SettingKind, category?: string) {
  return cache.get(`${kind}:${category ?? ""}`, () => settingsClient.list({ kind, category }));
}

export function useCatalogOptions(kind: SettingKind, category?: string) {
  const [items, setItems] = useState<SettingItem[]>([]);
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
