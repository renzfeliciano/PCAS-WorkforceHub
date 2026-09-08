"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSession, signOut } from "next-auth/react";
import { RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;

// How often real client activity is allowed to ping the server to refresh
// lastActivityAt. Without this, the server-side staleness check (middleware's
// `authorized` callback) only ever sees a fresh timestamp right after sign-in
// or an explicit "Stay signed in" click — a plain page load's own
// getServerSession() call runs inside a Server Component, which the App
// Router does not let set cookies, so it can't persist the refresh; a
// client-driven API call can (it runs in a Route Handler), but plenty of
// navigations don't fire one before the *next* navigation's middleware check
// runs. Net effect without this ping: a user who is genuinely active (moving
// the mouse, scrolling, clicking) but hasn't happened to trigger an API call
// gets signed out well before any real idle time has passed. 60s is safely
// below any sane inactivity window and keeps the DB ping cheap.
const SERVER_PING_THROTTLE_MS = 60_000;

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
  const lastServerPingRef = useRef(0);

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
      const now = Date.now();
      if (now - lastServerPingRef.current < SERVER_PING_THROTTLE_MS) return;
      lastServerPingRef.current = now;
      void getSession();
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
      backdropClassName="backdrop-priority"
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
