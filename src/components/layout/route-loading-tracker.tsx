"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { navigationLoadingBus } from "@/lib/loading-bus";

/** Safety net: if a click never actually navigates (e.g. blocked, failed), don't leave the loader stuck. */
const MAX_PENDING_MS = 4000;

export function RouteLoadingTracker() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pendingRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // isPending stays true until the destination route's Server Component data
  // has actually streamed in and React has committed the new tree — unlike
  // usePathname()/useSearchParams(), which update as soon as the router's URL
  // state changes, well before the new page is ready. Ending the loader off
  // pathname caused it to vanish while the old page was still on screen,
  // leaving a blank/stale gap until the real content finally painted.
  useEffect(() => {
    if (!isPending && pendingRef.current) {
      pendingRef.current = false;
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
      navigationLoadingBus.end();
    }
  }, [isPending]);

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

      // Take over the navigation ourselves (instead of letting next/link's
      // own handler run it) so it happens inside our own startTransition —
      // that's what makes isPending above track the real thing.
      event.preventDefault();
      pendingRef.current = true;
      navigationLoadingBus.begin();
      safetyTimerRef.current = setTimeout(clearPending, MAX_PENDING_MS);
      startTransition(() => {
        router.push(href);
      });
    }

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      clearPending();
    };
  }, [router, startTransition]);

  return null;
}
