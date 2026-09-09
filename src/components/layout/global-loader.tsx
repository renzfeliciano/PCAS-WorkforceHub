"use client";

import { useLoadingBus } from "@/hooks/use-global-loading";
import { navigationLoadingBus } from "@/lib/loading-bus";

/** Shown immediately on every module switch and held for a beat, so hopping between pages doesn't feel instant. */
const MIN_VISIBLE_MS = 1000;

export function GlobalLoader() {
  const visible = useLoadingBus(navigationLoadingBus, { minVisibleMs: MIN_VISIBLE_MS });
  if (!visible) return null;

  return (
    <div className="global-loader">
      <div className="global-loader-skyline" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="global-loader-copy">
        <p className="global-loader-text">
          Workforce<b>Hub</b>
        </p>
        {/* <output> carries an implicit role="status" (aria-live="polite"),
            so only the text that actually needs announcing sits inside it —
            not the decorative skyline or static "WorkforceHub" heading. */}
        <output className="global-loader-caption">Loading your workspace…</output>
      </div>
    </div>
  );
}
