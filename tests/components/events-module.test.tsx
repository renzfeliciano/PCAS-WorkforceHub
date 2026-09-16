// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventsModule } from "@/features/events/events-module";
import { CurrentUserProvider } from "@/context/current-user-context";
import type { WorkforceEvent } from "@/types/event";

const listMonthMock = vi.fn();
vi.mock("@/features/events/api/events-client", () => ({
  eventsClient: {
    listMonth: (...args: unknown[]) => listMonthMock(...args),
  },
}));

function makeEvent(overrides: Partial<WorkforceEvent> = {}): WorkforceEvent {
  return {
    id: "event-1",
    title: "Town Hall",
    date: "2026-06-10",
    category: "Meeting",
    ...overrides,
  } as WorkforceEvent;
}

function renderWithUser() {
  return render(
    <CurrentUserProvider
      user={{ id: "u1", name: "Admin User", role: "Admin", hasAttendanceSelfService: false }}
    >
      <EventsModule />
    </CurrentUserProvider>,
  );
}

describe("EventsModule", () => {
  // Regression test: navigating to /events used to always show this
  // module's own loading spinner for a beat right after the global route
  // loader finished, since the calendar had no server-fetched data of its
  // own and only started fetching once mounted on the client. Server-seeded
  // initialData should let the calendar render immediately instead.
  it("renders the current month's events immediately when given initialData, without a loading spinner", () => {
    listMonthMock.mockResolvedValue({ items: [] });
    render(
      <CurrentUserProvider
        user={{ id: "u1", name: "Admin User", role: "Admin", hasAttendanceSelfService: false }}
      >
        <EventsModule initialData={{ items: [makeEvent()], month: "2026-06" }} />
      </CurrentUserProvider>,
    );

    expect(screen.getByText("Town Hall", { exact: false })).toBeInTheDocument();
    expect(document.querySelector(".month-calendar-loading")).not.toBeInTheDocument();
  });

  it("still shows a loading spinner on first mount when no initialData is given", () => {
    listMonthMock.mockReturnValue(new Promise(() => {}));
    renderWithUser();
    expect(document.querySelector(".month-calendar-loading")).toBeInTheDocument();
  });
});
