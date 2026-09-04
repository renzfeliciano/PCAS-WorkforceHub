"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useCurrentUser } from "@/context/current-user-context";
import { useSortState } from "@/hooks/use-sort-state";
import { usePermissionUsers } from "@/features/permissions/hooks/use-permission-users";
import type { UserListInitialData } from "@/features/permissions/hooks/use-permission-users";
import { UsersTable } from "@/features/permissions/components/users-table";
import { UserFormDialog } from "@/features/permissions/components/user-form-dialog";
import { DeactivateUserDialog } from "@/features/permissions/components/deactivate-user-dialog";
import { ResetDataDialog } from "@/features/permissions/components/reset-data-dialog";
import { adminResetClient } from "@/features/permissions/api/admin-reset-client";
import type { AppUser } from "@/types/user";

const DEFAULT_PAGE_SIZE = 10;

export function PermissionsModule({
  dataResetEnabled,
  initialData,
}: Readonly<{ dataResetEnabled: boolean; initialData?: UserListInitialData }>) {
  const currentUser = useCurrentUser();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { sortBy, sortDir, toggleSort } = useSortState();
  const { items, total, isLoading, error, create, update, deactivate } = usePermissionUsers(
    { page, pageSize, sortBy, sortDir },
    initialData,
  );
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [deactivating, setDeactivating] = useState<AppUser | null>(null);
  const [resetting, setResetting] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  async function handleActivate(user: AppUser) {
    setActivatingId(user.id);
    try {
      await update(user.id, { active: true });
    } finally {
      setActivatingId(null);
    }
  }

  return (
    <div className="settings-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Access control</p>
          <h1>Permissions</h1>
          <p className="muted">
            Create and manage user accounts and role assignments.
          </p>
        </div>
        <span className="role-badge">
          <ShieldCheck size={15} /> Admin access
        </span>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="actions section-toolbar">
        <Button variant="primary" type="button" onClick={() => setAdding(true)}>
          Add user
        </Button>
      </div>
      {isLoading ? (
        <TableSkeleton
          columnWidths={["25%", "20%", "15%", "15%", "20%"]}
          rows={pageSize}
        />
      ) : (
        <UsersTable
          users={items}
          currentUserId={currentUser.id}
          activatingId={activatingId}
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
          onEdit={setEditing}
          onActivate={handleActivate}
          onDeactivate={setDeactivating}
        />
      )}
      {adding && (
        <UserFormDialog
          mode="create"
          onClose={() => setAdding(false)}
          onSubmit={async (input) => {
            await create({
              username: input.username ?? "",
              email: input.email,
              name: input.name,
              role: input.role,
              password: input.password ?? "",
            });
            setAdding(false);
          }}
        />
      )}
      {editing && (
        <UserFormDialog
          mode="edit"
          initialValue={editing}
          disableRole={editing.id === currentUser.id}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            await update(editing.id, {
              username: input.username,
              email: input.email,
              name: input.name,
              role: editing.id === currentUser.id ? undefined : input.role,
              password: input.password,
            });
            setEditing(null);
          }}
        />
      )}
      {deactivating && (
        <DeactivateUserDialog
          user={deactivating}
          onClose={() => setDeactivating(null)}
          onConfirm={async () => {
            await deactivate(deactivating.id);
            setDeactivating(null);
          }}
        />
      )}
      {dataResetEnabled && (
        <section className="danger-zone">
          <h2>Danger zone</h2>
          <p className="muted">
            Permanently clear all employees, catalog options, and leave types so
            you can retest your database seeding from a clean state.
          </p>
          <Button
            variant="danger"
            type="button"
            onClick={() => setResetting(true)}
            className="mt-2"
          >
            Reset all workspace data
          </Button>
        </section>
      )}
      {resetting && (
        <ResetDataDialog
          onClose={() => setResetting(false)}
          onConfirm={async () => {
            await adminResetClient.resetWorkspaceData();
            setResetting(false);
          }}
        />
      )}
    </div>
  );
}
