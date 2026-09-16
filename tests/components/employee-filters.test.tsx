// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmployeeFilters } from "@/features/employees/components/employee-filters";
import type { CatalogItem } from "@/types/catalog";

function statusItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: "status-1",
    name: "Regular",
    kind: "status",
    active: true,
    grantsAttendanceSelfService: false,
    countsAsActiveEmployment: true,
    ...overrides,
  };
}

function projectItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: "proj-1",
    name: "Rufino Tower",
    kind: "project",
    active: true,
    grantsAttendanceSelfService: false,
    countsAsActiveEmployment: true,
    ...overrides,
  };
}

function renderFilters(overrides: Partial<React.ComponentProps<typeof EmployeeFilters>> = {}) {
  const props = {
    query: "",
    onQueryChange: vi.fn(),
    selectedStatuses: [],
    onSelectedStatusesChange: vi.fn(),
    selectedProjectId: "",
    onSelectedProjectIdChange: vi.fn(),
    showArchived: false,
    onShowArchivedChange: vi.fn(),
    statuses: [statusItem()],
    projects: [projectItem()],
    canManage: true,
    canViewAllProjects: true,
    ...overrides,
  };
  render(<EmployeeFilters {...props} />);
  return props;
}

describe("EmployeeFilters — project filter", () => {
  it("lists 'All projects' plus each active project", () => {
    renderFilters({
      projects: [
        projectItem({ id: "proj-1", name: "Rufino Tower" }),
        projectItem({ id: "proj-2", name: "South Insula", active: false }),
      ],
    });
    const select = screen.getByLabelText("Filter by project");
    expect(within(select).getByText("All projects")).toBeInTheDocument();
    expect(within(select).getByText("Rufino Tower")).toBeInTheDocument();
    // An inactive project shouldn't clutter the filter's option list.
    expect(within(select).queryByText("South Insula")).not.toBeInTheDocument();
  });

  it("calls onSelectedProjectIdChange when a project is picked", async () => {
    const user = userEvent.setup();
    const props = renderFilters({ projects: [projectItem({ id: "proj-1", name: "Rufino Tower" })] });
    await user.selectOptions(screen.getByLabelText("Filter by project"), "proj-1");
    expect(props.onSelectedProjectIdChange).toHaveBeenCalledWith("proj-1");
  });

  it("reflects the currently selected project", () => {
    renderFilters({
      selectedProjectId: "proj-1",
      projects: [projectItem({ id: "proj-1", name: "Rufino Tower" })],
    });
    expect((screen.getByLabelText("Filter by project") as HTMLSelectElement).value).toBe("proj-1");
  });

  it("hides the project picker when the viewer is already scoped to one project", () => {
    renderFilters({ canViewAllProjects: false });
    expect(screen.queryByLabelText("Filter by project")).not.toBeInTheDocument();
  });
});
