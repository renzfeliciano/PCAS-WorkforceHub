"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSession, signOut } from "next-auth/react";
import { RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const minutesText = `${minutes} min`;
  const secondsText = `${seconds} sec${seconds === 1 ? "" : "s"}`;

  if (minutes === 0) return secondsText;
  if (seconds === 0) return minutesText;
  return `${minutesText} ${secondsText}`;
}

/**
 * Idle session policy: after `idleMs` of no activity, warn the user instead
 * of signing them out immediately. The warning counts down `warningMs`
 * (shown in seconds); signing out only happens if that countdown finishes
 * with no response. Any explicit "Stay signed in" click resets the cycle.
 * Passive activity is ignored once the warning is showing, so it takes a
 * deliberate action to dismiss it (not just an incidental mouse twitch).
 */
export function IdleSessionGuard({
  idleMs,
  warningMs,
}: Readonly<{ idleMs: number; warningMs: number }>) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [isExtending, setIsExtending] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningActiveRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      warningActiveRef.current = true;
      let remaining = Math.max(1, Math.round(warningMs / 1000));
      setSecondsLeft(remaining);
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearTimers();
          signOut({ callbackUrl: "/login" });
          return;
        }
        setSecondsLeft(remaining);
      }, 1000);
    }, idleMs);
  }, [idleMs, warningMs, clearTimers]);

  const handleStaySignedIn = useCallback(async () => {
    setIsExtending(true);
    try {
      // Pings /api/auth/session, which re-runs the jwt callback and refreshes
      // the server-side lastActivityAt — genuinely extending the session
      // rather than only resetting this client-side timer.
      const session = await getSession();
      if (!session) {
        clearTimers();
        signOut({ callbackUrl: "/login" });
        return;
      }
      warningActiveRef.current = false;
      setSecondsLeft(null);
      clearTimers();
      startIdleTimer();
    } finally {
      setIsExtending(false);
    }
  }, [clearTimers, startIdleTimer]);

  useEffect(() => {
    if (!idleMs || idleMs <= 0) return;

    function handleActivity() {
      if (warningActiveRef.current) return;
      startIdleTimer();
    }

    startIdleTimer();
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, handleActivity, { passive: true });
    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, handleActivity);
    };
  }, [idleMs, startIdleTimer, clearTimers]);

  if (secondsLeft === null) return null;

  return (
    <Modal
      eyebrow="Session timeout"
      title="Still there?"
      description={`For your security, you'll be signed out in ${formatCountdown(secondsLeft)} of inactivity.`}
      onClose={handleStaySignedIn}
      actions={
        <>
          <Button
            variant="secondary"
            type="button"
            disabled={isExtending}
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Log out now
          </Button>
          <Button
            variant="primary"
            type="button"
            isLoading={isExtending}
            loadingText="Extending session"
            onClick={handleStaySignedIn}
          >
            <RefreshCw size={14} /> Stay signed in
          </Button>
        </>
      }
    />
  );
}
