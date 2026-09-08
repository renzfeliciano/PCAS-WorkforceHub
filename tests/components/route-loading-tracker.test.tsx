// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { RouteLoadingTracker } from "@/components/layout/route-loading-tracker";
import { navigationLoadingBus } from "@/lib/loading-bus";

const push = vi.fn();

// usePathname/useSearchParams intentionally never change across the test —
// this reproduces the real-world race where Next.js updates the router's URL
// state before the destination route's Server Component data has actually
// streamed in and committed. A fix that ends the loader off a pathname
// change (instead of off the navigation transition itself) must fail this
// test, since that signal never fires here.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/employees/roster",
  useSearchParams: () => new URLSearchParams(),
}));

describe("RouteLoadingTracker", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("ends the global loader once the navigation transition settles, not merely when the URL state changes", async () => {
    const begin = vi.spyOn(navigationLoadingBus, "begin");
    const end = vi.spyOn(navigationLoadingBus, "end");

    render(
      <>
        <RouteLoadingTracker />
        <Link href="/employees/attendance">Attendance</Link>
      </>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: "Attendance" }));

    expect(begin).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/employees/attendance");

    await waitFor(() => expect(end).toHaveBeenCalledTimes(1));
  });
});
