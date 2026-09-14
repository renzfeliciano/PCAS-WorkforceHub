"use client";

import { Search } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { roleSchema } from "@/schemas/user";

const ROLES = roleSchema.options;

export type UsersFiltersValue = {
  query: string;
  role: string;
  status: string;
};

type UsersFiltersProps = Readonly<{
  value: UsersFiltersValue;
  onChange: (value: UsersFiltersValue) => void;
  isFetching?: boolean;
}>;

export function UsersFilters({ value, onChange, isFetching }: UsersFiltersProps) {
  return (
    <div className="toolbar">
      <div className="search">
        {isFetching ? <Spinner size={16} /> : <Search size={16} />}
        <input
          value={value.query}
          onChange={(event) => onChange({ ...value, query: event.target.value })}
          placeholder="Search users by name, username, or email..."
          data-testid="user-filter-search"
        />
      </div>
      <div className="toolbar-filters">
        <label className="case-filter">
          <span>Role</span>
          <select
            value={value.role}
            onChange={(event) => onChange({ ...value, role: event.target.value })}
            data-testid="user-filter-role"
          >
            <option value="">All roles</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label className="case-filter">
          <span>Status</span>
          <select
            value={value.status}
            onChange={(event) => onChange({ ...value, status: event.target.value })}
            data-testid="user-filter-status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>
    </div>
  );
}
