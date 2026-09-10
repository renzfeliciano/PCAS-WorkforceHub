"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { SettingItem } from "@/types/settings";

type EmployeeFiltersProps = Readonly<{
  query: string;
  onQueryChange: (value: string) => void;
  selectedStatuses: string[];
  onSelectedStatusesChange: (values: string[]) => void;
  selectedProjectId: string;
  onSelectedProjectIdChange: (value: string) => void;
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
  statuses: SettingItem[];
  projects: SettingItem[];
  canManage: boolean;
  isFetching?: boolean;
}>;

export function EmployeeFilters({
  query,
  onQueryChange,
  selectedStatuses,
  onSelectedStatusesChange,
  selectedProjectId,
  onSelectedProjectIdChange,
  showArchived,
  onShowArchivedChange,
  statuses,
  projects,
  canManage,
  isFetching,
}: EmployeeFiltersProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Filtered/matched by id (statuses can be renamed without breaking a
  // filter already in flight), displayed by the catalog's current name.
  const statusOptions = statuses.filter((item) => item.active).map((item) => ({ id: item.id, name: item.name }));
  const statusIds = statusOptions.map((item) => item.id);
  const noStatusFilter = selectedStatuses.length === 0;
  const isAllActive = noStatusFilter && !showArchived;

  useEffect(() => {
    if (!open) return;
    function handleOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function toggleStatus(id: string) {
    // While "All" is active every option shows as checked; unchecking one
    // narrows the selection to "everything except that one" rather than
    // starting from nothing.
    const baseline = noStatusFilter ? statusIds : selectedStatuses;
    const isChecked = baseline.includes(id);
    const next = isChecked
      ? baseline.filter((item) => item !== id)
      : [...baseline, id];
    // Selecting every individual status is equivalent to "All" selected.
    onSelectedStatusesChange(next.length === statusIds.length ? [] : next);
  }

  function selectAll() {
    onSelectedStatusesChange([]);
    onShowArchivedChange(false);
  }

  const selectedStatusNames = selectedStatuses.map(
    (id) => statusOptions.find((item) => item.id === id)?.name ?? id,
  );
  const summaryLabel = isAllActive
    ? "All"
    : [...selectedStatusNames, ...(showArchived ? ["Archived"] : [])].join(", ");

  return (
    <div className="toolbar">
      <div className="search">
        {isFetching ? <Spinner size={16} /> : <Search size={16} />}
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search employees, roles, projects..."
        />
      </div>
      <select
        className="project-filter"
        value={selectedProjectId}
        onChange={(event) => onSelectedProjectIdChange(event.target.value)}
        aria-label="Filter by project"
        data-testid="employee-filter-project"
      >
        <option value="">All projects</option>
        {projects
          .filter((item) => item.active)
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
      </select>
      <div className="status-dropdown" ref={containerRef}>
        <button
          type="button"
          className="status-dropdown-trigger"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span>{summaryLabel}</span>
          <ChevronDown size={14} />
        </button>
        {open && (
          <div className="status-dropdown-panel" role="listbox">
            <label className="status-dropdown-option">
              <input type="checkbox" checked={isAllActive} onChange={selectAll} />
              All
            </label>
            {statusOptions.map((option) => (
              <label className="status-dropdown-option" key={option.id}>
                <input
                  type="checkbox"
                  checked={noStatusFilter || selectedStatuses.includes(option.id)}
                  onChange={() => toggleStatus(option.id)}
                />
                {option.name}
              </label>
            ))}
            {canManage && (
              <>
                <div className="status-dropdown-divider" />
                <label className="status-dropdown-option">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(event) => onShowArchivedChange(event.target.checked)}
                  />
                  Archived
                </label>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
