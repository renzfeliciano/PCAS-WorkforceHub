"use client";

import { useEffect, useState } from "react";
import { settingsClient } from "@/features/settings/api/settings-client";
import type { SettingItem, SettingKind } from "@/types/settings";

export function useCatalogOptions(kind: SettingKind, category?: string) {
  const [items, setItems] = useState<SettingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    settingsClient
      .list({ kind, category })
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
