"use client";

import { useEffect, useRef, useState } from "react";
import type { LoadingBus } from "@/lib/loading-bus";

type Options = {
  /** Avoids a flash for near-instant work. 0 means show immediately. */
  showDelayMs?: number;
  /** Once shown, stays up at least this long. */
  minVisibleMs?: number;
};

export function useLoadingBus(bus: LoadingBus, options: Options = {}): boolean {
  const { showDelayMs = 0, minVisibleMs = 0 } = options;
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    return bus.subscribe((pending) => {
      if (pending) {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        if (!visibleRef.current && !showTimerRef.current) {
          showTimerRef.current = setTimeout(() => {
            showTimerRef.current = null;
            visibleRef.current = true;
            shownAtRef.current = Date.now();
            setVisible(true);
          }, showDelayMs);
        }
        return;
      }
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
        return;
      }
      if (visibleRef.current && shownAtRef.current) {
        const elapsed = Date.now() - shownAtRef.current;
        const remaining = Math.max(0, minVisibleMs - elapsed);
        hideTimerRef.current = setTimeout(() => {
          hideTimerRef.current = null;
          visibleRef.current = false;
          shownAtRef.current = null;
          setVisible(false);
        }, remaining);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bus]);

  return visible;
}
