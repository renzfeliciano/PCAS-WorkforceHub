"use client";

import { useState } from "react";
import { Download, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useCurrentUser } from "@/context/current-user-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCatalogOptions } from "@/hooks/use-catalog-options";
import { useLeaveTypeOptions } from "@/hooks/use-leave-type-options";
import { canDeleteEmployees, canEditEmployees, canManageLeaveBalances } from "@/lib/rbac";
import { EMPLOYMENT_STATUS_CATEGORY } from "@/types/settings";
import { EmployeeTable } from "@/features/employees/components/employee-table";
import { EmployeeFilters } from "@/features/employees/components/employee-filters";
import { EmployeeFormDialog } from "@/features/employees/components/employee-form-dialog";
import { LeaveBalancesDialog } from "@/features/employees/components/leave-balances-dialog";
import { ArchiveEmployeeDialog } from "@/features/employees/components/archive-employee-dialog";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { exportEmployeesCsv } from "@/features/employees/utils/export-csv";
import type { Employee } from "@/types/employee";

const PAGE_SIZE = 10;

export function EmployeesModule() {
  const user = useCurrentUser();
  const canEdit = canEditEmployees(user.role);
  const canDelete = canDeleteEmployees(user.role);
  const canManageLeave = canManageLeaveBalances(user.role);

  const [rawQuery, setRawQuery] = useState("");
  const query = useDebouncedValue(rawQuery, 300);
  const [status, setStatus] = useState("All");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);

  const { activeItems: statuses } = useCatalogOptions("status", EMPLOYMENT_STATUS_CATEGORY);
  const { items: leaveTypes } = useLeaveTypeOptions();
  const {
    items,
    total,
    isLoading,
    error,
    create,
    update,
    archive,
    restore,
    updateLeaveBalances,
  } = useEmployees({
    page,
    pageSize: PAGE_SIZE,
    query,
    status,
    includeArchived: showArchived,
  });

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<Employee | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Employee | null>(null);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">People directory</p>
          <h1>Employee roster</h1>
          <p className="muted">Every record, including leave balances and statutory IDs.</p>
        </div>
        <div className="actions">
          <Button variant="secondary" type="button" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => exportEmployeesCsv(items, leaveTypes)}
          >
            <Download size={15} /> Export CSV
          </Button>
          {canEdit && (
            <Button variant="primary" type="button" onClick={() => setAdding(true)}>
              <Plus size={16} /> Add employee
            </Button>
          )}
        </div>
      </div>
      <EmployeeFilters
        query={rawQuery}
        onQueryChange={(value) => {
          setRawQuery(value);
          setPage(1);
        }}
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
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
      {!isLoading && items.length === 0 ? (
        <EmptyState
          title="No employees found"
          description="Try a different search term or status filter."
        />
      ) : (
        <>
          <EmployeeTable
            employees={items}
            canEdit={canEdit}
            canDelete={canDelete}
            canManageLeaveBalances={canManageLeave}
            onEdit={setEditing}
            onLeaveBalances={setLeaveTarget}
            onArchive={setArchiveTarget}
            onRestore={(employee) => restore(employee.id)}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
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
      {leaveTarget && (
        <LeaveBalancesDialog
          employee={leaveTarget}
          onClose={() => setLeaveTarget(null)}
          onSave={async (balances) => {
            await updateLeaveBalances(leaveTarget.id, balances);
            setLeaveTarget(null);
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
    </>
  );
}
