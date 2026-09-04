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
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
  statuses: SettingItem[];
  canManage: boolean;
  isFetching?: boolean;
}>;

export function EmployeeFilters({
  query,
  onQueryChange,
  selectedStatuses,
  onSelectedStatusesChange,
  showArchived,
  onShowArchivedChange,
  statuses,
  canManage,
  isFetching,
}: EmployeeFiltersProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const statusOptions = statuses.filter((item) => item.active).map((item) => item.name);
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

  function toggleStatus(value: string) {
    // While "All" is active every option shows as checked; unchecking one
    // narrows the selection to "everything except that one" rather than
    // starting from nothing.
    const baseline = noStatusFilter ? statusOptions : selectedStatuses;
    const isChecked = baseline.includes(value);
    const next = isChecked
      ? baseline.filter((item) => item !== value)
      : [...baseline, value];
    // Selecting every individual status is equivalent to "All" selected.
    onSelectedStatusesChange(next.length === statusOptions.length ? [] : next);
  }

  function selectAll() {
    onSelectedStatusesChange([]);
    onShowArchivedChange(false);
  }

  const summaryLabel = isAllActive
    ? "All"
    : [...selectedStatuses, ...(showArchived ? ["Archived"] : [])].join(", ");

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
              <label className="status-dropdown-option" key={option}>
                <input
                  type="checkbox"
                  checked={noStatusFilter || selectedStatuses.includes(option)}
                  onChange={() => toggleStatus(option)}
                />
                {option}
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
