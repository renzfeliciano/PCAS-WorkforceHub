"use client";

import { useState } from "react";
import { AlertTriangle, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/context/current-user-context";
import { usePermissionUsers } from "@/features/permissions/hooks/use-permission-users";
import { UsersTable } from "@/features/permissions/components/users-table";
import { UserFormDialog } from "@/features/permissions/components/user-form-dialog";
import { DeactivateUserDialog } from "@/features/permissions/components/deactivate-user-dialog";
import { ResetDataDialog } from "@/features/permissions/components/reset-data-dialog";
import { adminResetClient } from "@/features/permissions/api/admin-reset-client";
import type { AppUser } from "@/types/user";

export function PermissionsModule({
  dataResetEnabled,
}: Readonly<{ dataResetEnabled: boolean }>) {
  const currentUser = useCurrentUser();
  const { items, error, create, update, deactivate } = usePermissionUsers();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [deactivating, setDeactivating] = useState<AppUser | null>(null);
  const [resetting, setResetting] = useState(false);

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
          <ShieldCheck size={15} /> Admin only
        </span>
      </div>
      <div className="settings-note">
        <ShieldCheck size={17} />
        <span>
          <b>Admin only.</b> You cannot change your own role or deactivate your
          own account.
        </span>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="actions section-toolbar">
        <Button variant="primary" type="button" onClick={() => setAdding(true)}>
          <Plus size={16} /> Add user
        </Button>
      </div>
      <UsersTable
        users={items}
        currentUserId={currentUser.id}
        onEdit={setEditing}
        onDeactivate={setDeactivating}
      />
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
            <AlertTriangle size={15} /> Reset all workspace data
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
