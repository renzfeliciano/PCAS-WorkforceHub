import { Search } from "lucide-react";
import type { SettingItem } from "@/types/settings";

type EmployeeFiltersProps = Readonly<{
  query: string;
  onQueryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  statuses: SettingItem[];
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
  canManage: boolean;
}>;

export function EmployeeFilters({
  query,
  onQueryChange,
  status,
  onStatusChange,
  statuses,
  showArchived,
  onShowArchivedChange,
  canManage,
}: EmployeeFiltersProps) {
  const statusOptions = [
    "All",
    ...statuses.filter((item) => item.active).map((item) => item.name),
  ];
  return (
    <div className="toolbar">
      <div className="search">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search employees, roles, projects..."
        />
      </div>
      <div className="filters">
        {statusOptions.map((item) => (
          <button
            key={item}
            type="button"
            className={status === item ? "selected" : ""}
            onClick={() => onStatusChange(item)}
          >
            {item}
          </button>
        ))}
        {canManage && (
          <button
            type="button"
            className={showArchived ? "selected" : ""}
            onClick={() => onShowArchivedChange(!showArchived)}
          >
            Archived
          </button>
        )}
      </div>
    </div>
  );
}
