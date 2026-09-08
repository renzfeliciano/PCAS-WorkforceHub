"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useCurrentUser } from "@/context/current-user-context";
import { useCatalogOptions } from "@/hooks/use-catalog-options";
import { useLeaveTypeOptions } from "@/hooks/use-leave-type-options";
import { useSortState } from "@/hooks/use-sort-state";
import { canDeleteEmployees, canEditEmployees } from "@/lib/rbac";
import { EMPLOYMENT_STATUS_CATEGORY } from "@/types/settings";
import { EmployeeTable } from "@/features/employees/components/employee-table";
import { EmployeeFilters } from "@/features/employees/components/employee-filters";
import { EmployeeFormDialog } from "@/features/employees/components/employee-form-dialog";
import { ArchiveEmployeeDialog } from "@/features/employees/components/archive-employee-dialog";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import type { EmployeeListInitialData } from "@/features/employees/hooks/use-employees";
import { employeesClient } from "@/features/employees/api/employees-client";
import { exportEmployeesCsv } from "@/features/employees/utils/export-csv";
import type { Employee } from "@/types/employee";

const EXPORT_PAGE_SIZE = 100;

const DEFAULT_PAGE_SIZE = 10;

export function EmployeesModule({
  initialData,
}: Readonly<{ initialData?: EmployeeListInitialData }>) {
  const user = useCurrentUser();
  const canEdit = canEditEmployees(user.role);
  const canDelete = canDeleteEmployees(user.role);

  const [rawQuery, setRawQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { sortBy, sortDir, toggleSort } = useSortState();

  const { activeItems: statuses } = useCatalogOptions(
    "status",
    EMPLOYMENT_STATUS_CATEGORY,
  );
  const { items: leaveTypes } = useLeaveTypeOptions();
  const {
    items,
    total,
    isLoading,
    isFetching,
    error,
    create,
    update,
    archive,
    restore,
    deletePermanently,
  } = useEmployees(
    {
      page,
      pageSize,
      query: rawQuery,
      status: selectedStatuses,
      includeArchived: showArchived,
      sortBy,
      sortDir,
    },
    initialData,
  );

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function handleRestore(employee: Employee) {
    setRestoringId(employee.id);
    try {
      await restore(employee.id);
    } finally {
      setRestoringId(null);
    }
  }

  async function handleExportCsv() {
    setIsExporting(true);
    try {
      const first = await employeesClient.list({
        query: rawQuery,
        status: selectedStatuses,
        includeArchived: showArchived,
        page: 1,
        pageSize: EXPORT_PAGE_SIZE,
      });
      const all = [...first.items];
      const totalPages = Math.ceil(first.total / EXPORT_PAGE_SIZE);
      for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
        const next = await employeesClient.list({
          query: rawQuery,
          status: selectedStatuses,
          includeArchived: showArchived,
          page: currentPage,
          pageSize: EXPORT_PAGE_SIZE,
        });
        all.push(...next.items);
      }
      exportEmployeesCsv(all, leaveTypes);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Workforce directory</p>
          <h1>Employee roster</h1>
          <p className="muted">
            Every record, including leave balances and statutory IDs.
          </p>
        </div>
        <div className="actions">
          <Button
            variant="secondary"
            type="button"
            onClick={handleExportCsv}
            isLoading={isExporting}
            loadingText="Exporting CSV"
            disabled={total === 0 || showArchived}
            title={
              total === 0
                ? "No records to export"
                : showArchived
                  ? "Archived records cannot be exported"
                  : undefined
            }
          >
            Export CSV
          </Button>
          {canEdit && (
            <Button
              variant="primary"
              type="button"
              onClick={() => setAdding(true)}
              data-testid="add-employee"
            >
              <UserPlus size={14} /> Add employee
            </Button>
          )}
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
        showArchived={showArchived}
        onShowArchivedChange={(value) => {
          setShowArchived(value);
          setPage(1);
        }}
        canManage={canDelete}
      />
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {isLoading ? (
        <TableSkeleton
          columnWidths={["15%", "30%", "25%", "25%", "8%"]}
          rows={pageSize}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No employees found"
          description="Try a different search term or status filter."
        />
      ) : (
        <EmployeeTable
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
          canEdit={canEdit}
          canDelete={canDelete}
          restoringId={restoringId}
          onEdit={setEditing}
          onArchive={setArchiveTarget}
          onRestore={handleRestore}
          onDeletePermanently={setDeleteTarget}
        />
      )}
      {adding && (
        <EmployeeFormDialog
          mode="create"
          onClose={() => setAdding(false)}
          onSubmit={async (input) => {
            await create(input);
            setAdding(false);
          }}
        />
      )}
      {editing && (
        <EmployeeFormDialog
          mode="edit"
          initialValue={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            await update(editing.id, input);
            setEditing(null);
          }}
        />
      )}
      {archiveTarget && (
        <ArchiveEmployeeDialog
          employee={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onConfirm={async () => {
            await archive(archiveTarget.id);
            setArchiveTarget(null);
          }}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          eyebrow="Permanent deletion"
          title={`Permanently delete ${deleteTarget.name}?`}
          description="This erases the employee record entirely, including attendance, leave, and travel order history. This cannot be undone."
          confirmLabel="Delete permanently"
          confirmLoadingLabel="Deleting permanently"
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await deletePermanently(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </>
  );
}
