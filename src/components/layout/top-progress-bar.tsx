"use client";

import { useLoadingBus } from "@/hooks/use-global-loading";
import { requestLoadingBus } from "@/lib/loading-bus";

/** Small delay avoids a flash for near-instant API calls. */
const SHOW_DELAY_MS = 150;
const MIN_VISIBLE_MS = 400;

export function TopProgressBar() {
  const visible = useLoadingBus(requestLoadingBus, {
    showDelayMs: SHOW_DELAY_MS,
    minVisibleMs: MIN_VISIBLE_MS,
  });
  if (!visible) return null;

  return <div className="top-progress-bar" role="status" aria-label="Loading" />;
}
