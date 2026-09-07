"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { navigationLoadingBus } from "@/lib/loading-bus";

/** Safety net: if a click never actually navigates (e.g. blocked, failed), don't leave the loader stuck. */
const MAX_PENDING_MS = 4000;

export function RouteLoadingTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pendingRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentKeyRef = useRef(`${pathname}?${searchParams.toString()}`);

  useEffect(() => {
    function clearPending() {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
      if (pendingRef.current) {
        pendingRef.current = false;
        navigationLoadingBus.end();
      }
    }

    function handleClick(event: MouseEvent) {
      // Note: don't bail on event.defaultPrevented — next/link's own click
      // handler calls preventDefault() as a normal part of client-side
      // routing, so that would skip every legitimate navigation.
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement)?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.origin !== window.location.origin) return;
      if (anchor.pathname + anchor.search === window.location.pathname + window.location.search) return;

      pendingRef.current = true;
      navigationLoadingBus.begin();
      safetyTimerRef.current = setTimeout(clearPending, MAX_PENDING_MS);
    }

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      clearPending();
    };
  }, []);

  useEffect(() => {
    const key = `${pathname}?${searchParams.toString()}`;
    if (key === currentKeyRef.current) return;
    currentKeyRef.current = key;
    if (pendingRef.current) {
      pendingRef.current = false;
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
      navigationLoadingBus.end();
    }
  }, [pathname, searchParams]);

  return null;
}
