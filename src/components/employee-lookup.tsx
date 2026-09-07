"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { employeesClient } from "@/features/employees/api/employees-client";
import type { Employee } from "@/types/employee";

const RESULT_LIMIT = 8;

type EmployeeLookupProps = Readonly<{
  basePath: string;
  eyebrow: string;
  title: string;
  description: string;
  placeholder: string;
}>;

export function EmployeeLookup({
  basePath,
  eyebrow,
  title,
  description,
  placeholder,
}: EmployeeLookupProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      queueMicrotask(() => {
        if (!cancelled) {
          setResults([]);
          setIsLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    queueMicrotask(() => {
      if (!cancelled) setIsLoading(true);
    });
    employeesClient
      .list({ query: trimmed, pageSize: RESULT_LIMIT, includeArchived: false })
      .then((result) => {
        if (!cancelled) setResults(result.items);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const trimmedQuery = query.trim();
  const hasResults = results.length > 0;
  const showNoResults = Boolean(trimmedQuery) && !isLoading && !hasResults;
  const showPrompt = !trimmedQuery && !hasResults;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
      </div>
      <div className="employee-lookup">
        <div className="employee-lookup-search">
          {isLoading ? <Spinner size={16} /> : <Search size={16} />}
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
        </div>
        {hasResults && (
          <div className="employee-lookup-results">
            {results.map((employee) => (
              <Link
                key={employee.id}
                href={`${basePath}/${employee.id}`}
                className="employee-lookup-result"
              >
                <Avatar name={employee.name} tone="blue" />
                <div>
                  <b>{employee.name}</b>
                  <small>
                    {employee.employeeNumber} · {employee.position}
                  </small>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      {showNoResults && (
        <EmptyState
          title="No employees found"
          description="Try a different name, employee number, or position."
        />
      )}
      {showPrompt && (
        <EmptyState
          title="Search for an employee"
          description="Start typing a name, or employee number to look someone up."
        />
      )}
    </>
  );
}
