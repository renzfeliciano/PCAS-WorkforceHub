"use client";

import { useState } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useCatalogOptions } from "@/hooks/use-catalog-options";
import { useSortState } from "@/hooks/use-sort-state";
import { EmployeeFilters } from "@/features/employees/components/employee-filters";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import type { EmployeeListInitialData } from "@/features/employees/hooks/use-employees";
import { AttendanceEmployeeTable } from "@/features/attendance/components/attendance-employee-table";
import { EMPLOYMENT_STATUS_CATEGORY } from "@/types/settings";

const DEFAULT_PAGE_SIZE = 10;

export function AttendanceModule({
  initialData,
}: Readonly<{ initialData?: EmployeeListInitialData }>) {
  const [rawQuery, setRawQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { sortBy, sortDir, toggleSort } = useSortState();

  const { activeItems: statuses } = useCatalogOptions("status", EMPLOYMENT_STATUS_CATEGORY);
  const { items, total, isLoading, isFetching, error } = useEmployees(
    {
      page,
      pageSize,
      query: rawQuery,
      status: selectedStatuses,
      includeArchived: false,
      sortBy,
      sortDir,
    },
    initialData,
  );

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Time and attendance</p>
          <h1>Attendance monitoring</h1>
          <p className="muted">
            Daily attendance logged for monitoring; approval happens externally.
          </p>
        </div>
      </div>
      <EmployeeFilters
        isFetching={isFetching}
        query={rawQuery}
        onQueryChange={(value) => {
          setRawQuery(value);
          setPage(1);
        }}
        selectedStatuses={selectedStatuses}
        onSelectedStatusesChange={(values) => {
          setSelectedStatuses(values);
          setPage(1);
        }}
        statuses={statuses}
        showArchived={false}
        onShowArchivedChange={() => {}}
        canManage={false}
      />
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {isLoading ? (
        <TableSkeleton columnWidths={["15%", "30%", "25%", "25%", "8%"]} rows={pageSize} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No employees found"
          description="Try a different search term or status filter."
        />
      ) : (
        <AttendanceEmployeeTable
          employees={items}
          startIndex={(page - 1) * pageSize}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={(field) => {
            toggleSort(field);
            setPage(1);
          }}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
      )}
    </>
  );
}
