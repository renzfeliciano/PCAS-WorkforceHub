"use client";

import { useEffect, useState } from "react";
import { getSession, signOut } from "next-auth/react";
import { ShieldAlert } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

// How often an open tab checks whether its own session is still the active
// one. auth.ts's jwt callback stamps a fresh activeSessionId into the DB on
// every sign-in, so a second login (same account, another device/tab)
// immediately makes every other open session's token stale from the
// server's point of view — but that tab only finds out the next time
// something re-runs the jwt callback. Middleware alone would only catch this
// on that tab's next navigation, which can be arbitrarily far off and reads
// as an unexplained bounce to /login. Polling here surfaces it, with an
// explicit reason, while the tab is still sitting open.
const POLL_INTERVAL_MS = 30_000;

/**
 * Distinct from IdleSessionGuard: this fires only when the account was
 * signed in elsewhere (a different, still-valid login superseded this tab's
 * session), never for a plain idle timeout — that case is already owned by
 * IdleSessionGuard's own warning-then-sign-out flow.
 */
export function ConcurrentSessionGuard() {
  const [signedOutElsewhere, setSignedOutElsewhere] = useState(false);

  useEffect(() => {
    if (signedOutElsewhere) return;
    let cancelled = false;

    async function check() {
      const session = await getSession().catch(() => null);
      if (cancelled) return;
      if (session?.error === "ConcurrentSessionError") setSignedOutElsewhere(true);
    }

    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [signedOutElsewhere]);

  if (!signedOutElsewhere) return null;

  return (
    <Modal
      eyebrow="Signed out"
      title="Your account was signed in elsewhere"
      description="For your security, only one active session is allowed per account. This session has been signed out because your account was used to sign in on another device or browser."
      onClose={() => signOut({ callbackUrl: "/login?reason=concurrent-session" })}
      backdropClassName="backdrop-priority"
      actions={
        <Button
          variant="primary"
          type="button"
          onClick={() => signOut({ callbackUrl: "/login?reason=concurrent-session" })}
        >
          <ShieldAlert size={14} /> Return to login
        </Button>
      }
    />
  );
}
