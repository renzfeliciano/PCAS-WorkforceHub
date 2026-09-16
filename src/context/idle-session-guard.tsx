"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSession, signOut } from "next-auth/react";
import { RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;

// How often the client proactively re-validates the session with the server
// while the user is active, refreshing lastActivityAt ahead of time instead
// of only in reaction to a specific DOM event.
//
// An earlier version pinged once per activity event (throttled). That has a
// race: a click that is both "activity" and a page navigation fires the ping
// and the navigation's own request at the same instant, and the navigation's
// server-side staleness check (proxy.ts's `authorized` callback) reads
// whatever cookie the browser already has — which is almost always still
// stale, since the ping's Set-Cookie response hasn't landed yet. A user who
// pauses to read or fill out a field for longer than the throttle window,
// then clicks a nav link, got signed out by the very click that proved they
// were still there.
//
// Running this as a standing interval instead — independent of any specific
// click — means the server-side timestamp is never more than one interval
// stale by the time a later navigation happens, instead of racing it. Capped
// at 60s (same DB-load budget as the previous per-event throttle) and
// floored at 5s so an unusually short configured inactivity window still
// gets several refreshes before it could lapse.
const HEARTBEAT_MAX_MS = 60_000;
const HEARTBEAT_MIN_MS = 5_000;
const HEARTBEAT_DIVISOR = 4;

function heartbeatIntervalFor(idleMs: number): number {
  return Math.min(HEARTBEAT_MAX_MS, Math.max(HEARTBEAT_MIN_MS, Math.floor(idleMs / HEARTBEAT_DIVISOR)));
}

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
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningActiveRef = useRef(false);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    heartbeatIntervalRef.current = null;
  }, []);

  // Idempotent: safe to call from every activity event without restarting
  // (and re-delaying) an already-running heartbeat.
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) return;
    heartbeatIntervalRef.current = setInterval(() => {
      void getSession();
    }, heartbeatIntervalFor(idleMs));
  }, [idleMs]);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    stopHeartbeat();
  }, [stopHeartbeat]);

  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      warningActiveRef.current = true;
      // Once the warning is up, an unattended session shouldn't keep
      // silently refreshing itself in the background — only an explicit
      // "Stay signed in" (below) should extend it from here.
      stopHeartbeat();
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
  }, [idleMs, warningMs, clearTimers, stopHeartbeat]);

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
      startHeartbeat();
    } finally {
      setIsExtending(false);
    }
  }, [clearTimers, startIdleTimer, startHeartbeat]);

  useEffect(() => {
    if (!idleMs || idleMs <= 0) return;

    function handleActivity() {
      if (warningActiveRef.current) return;
      startIdleTimer();
      startHeartbeat();
    }

    // Loading this page at all is itself evidence of recent activity, so
    // both timers start immediately rather than waiting for a first DOM
    // event — matching the pre-existing idle-timer behavior (a page left
    // completely untouched after load still warns after idleMs).
    startIdleTimer();
    startHeartbeat();
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, handleActivity, { passive: true });
    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, handleActivity);
    };
  }, [idleMs, startIdleTimer, startHeartbeat, clearTimers]);

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
