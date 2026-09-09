"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { employeesClient } from "@/features/employees/api/employees-client";
import type { EmployeeRef } from "@/types/employee";

type EmployeePickerProps = Readonly<{
  selected: EmployeeRef[];
  onChange: (employees: EmployeeRef[]) => void;
  /** Single-select mode: picking an employee replaces the current selection instead of adding to it. Defaults to multi-select. */
  multiple?: boolean;
}>;

const PAGE_SIZE = 20;

export function EmployeePicker({ selected, onChange, multiple = true }: EmployeePickerProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<EmployeeRef[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setIsLoading(true);
    });
    employeesClient
      .list({
        query: debouncedQuery,
        pageSize: PAGE_SIZE,
        includeArchived: false,
      })
      .then((result) => {
        if (cancelled) return;
        setResults(
          result.items.map((employee) => ({
            employeeId: employee.id,
            employeeNumber: employee.employeeNumber,
            name: employee.name,
          })),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const selectedIds = new Set(selected.map((employee) => employee.employeeId));

  function toggle(employee: EmployeeRef) {
    if (!multiple) {
      onChange(selectedIds.has(employee.employeeId) ? [] : [employee]);
      return;
    }
    if (selectedIds.has(employee.employeeId)) {
      onChange(
        selected.filter((item) => item.employeeId !== employee.employeeId),
      );
    } else {
      onChange([...selected, employee]);
    }
  }

  function remove(employeeId: string) {
    onChange(selected.filter((item) => item.employeeId !== employeeId));
  }

  return (
    <div className="employee-picker">
      {selected.length > 0 && (
        <div className="employee-picker-chips">
          {selected.map((employee) => (
            <span className="chip" key={employee.employeeId}>
              {employee.name}
              <button
                type="button"
                onClick={() => remove(employee.employeeId)}
                aria-label={`Remove ${employee.name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="employee-picker-search">
        {isLoading ? <Spinner size={14} /> : <Search size={14} />}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search employees by name, or employee number"
        />
      </div>
      {results.length > 0 && (
        <div className="employee-picker-columns">
          <span className="employee-picker-columns-spacer" />
          <span>Name</span>
          <span>Employee #</span>
        </div>
      )}
      <div className="employee-picker-list">
        {results.length === 0 && !isLoading && (
          <p className="muted employee-picker-empty">No employees found.</p>
        )}
        {results.map((employee) => (
          <label className="employee-picker-option" key={employee.employeeId}>
            <input
              type={multiple ? "checkbox" : "radio"}
              name={multiple ? undefined : "employee-picker-single"}
              checked={selectedIds.has(employee.employeeId)}
              onChange={() => toggle(employee)}
            />
            <span>{employee.name}</span>
            <small>{employee.employeeNumber || "—"}</small>
          </label>
        ))}
      </div>
    </div>
  );
}
