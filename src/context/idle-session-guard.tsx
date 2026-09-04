"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;

export function IdleSessionGuard({
  timeoutMinutes,
}: Readonly<{ timeoutMinutes: number }>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!timeoutMinutes || timeoutMinutes <= 0) return;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    function handleTimeout() {
      signOut({ callbackUrl: "/login" });
    }

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleTimeout, timeoutMs);
    }

    resetTimer();
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, resetTimer, { passive: true });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, resetTimer);
    };
  }, [timeoutMinutes]);

  return null;
}
