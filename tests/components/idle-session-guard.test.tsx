// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { IdleSessionGuard } from "@/context/idle-session-guard";

const getSessionMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("next-auth/react", () => ({
  getSession: () => getSessionMock(),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

beforeEach(() => {
  vi.useFakeTimers();
  getSessionMock.mockResolvedValue({ user: { id: "u1" } });
});

afterEach(() => {
  vi.useRealTimers();
});

function click() {
  window.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("IdleSessionGuard", () => {
  // Regression test for a real production bug: the old implementation only
  // pinged the server (to refresh lastActivityAt) once per discrete DOM
  // activity event, throttled to at most once every 60s. A click that both
  // counts as "activity" and triggers a page navigation fires the ping and
  // the navigation at the same instant — the navigation's own server-side
  // staleness check (proxy.ts) reads whatever cookie the browser already
  // has, which is almost always still stale because the ping's response
  // hasn't landed yet. Net effect: a user who pauses to read/fill a field
  // for a while, then clicks a nav link, gets signed out by the very click
  // that proves they're still there. The fix runs the refresh as a standing
  // interval, decoupled from any specific click, so the server-side
  // timestamp is never more than one interval stale by the time some later
  // navigation happens.
  it("proactively refreshes the session on a steady interval, not only in reaction to a discrete event", () => {
    render(<IdleSessionGuard idleMs={300_000} warningMs={10_000} />);

    // Mounting (the page having just loaded) already starts the heartbeat —
    // no click needed — and no further discrete activity events fire at all
    // below. The old per-event ping would never call getSession again in
    // this window once its one throttled call had fired.
    vi.advanceTimersByTime(60_000);
    expect(getSessionMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(180_000);
    expect(getSessionMock).toHaveBeenCalledTimes(4);
  });

  it("keeps refreshing across a discrete activity event without restarting (and re-delaying) the heartbeat", () => {
    render(<IdleSessionGuard idleMs={300_000} warningMs={10_000} />);

    vi.advanceTimersByTime(30_000);
    click();
    // Still on the original mount-time schedule (30s, not reset to 0 by the click).
    vi.advanceTimersByTime(30_000);
    expect(getSessionMock).toHaveBeenCalledTimes(1);
  });

  it("stops refreshing once the idle warning appears, instead of silently keeping an unattended session alive", () => {
    render(<IdleSessionGuard idleMs={300_000} warningMs={10_000} />);
    click();

    vi.advanceTimersByTime(300_000 + 30_000);
    const callsAtWarning = getSessionMock.mock.calls.length;
    expect(callsAtWarning).toBeGreaterThan(0);

    vi.advanceTimersByTime(120_000);
    expect(getSessionMock.mock.calls.length).toBe(callsAtWarning);
  });

  it("scales the refresh cadence down for a short configured idle window, capped at a 5s floor", () => {
    render(<IdleSessionGuard idleMs={20_000} warningMs={5_000} />);
    click();

    vi.advanceTimersByTime(5_000);
    expect(getSessionMock).toHaveBeenCalledTimes(1);
  });
});
