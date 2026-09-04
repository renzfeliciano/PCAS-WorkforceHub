"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import type { AppUser, Role } from "@/types/user";

const ROLES: Role[] = ["Admin", "HR", "Manager", "Employee"];

export type UserFormValues = {
  username?: string;
  email?: string;
  name: string;
  role: Role;
  password?: string;
};

type UserFormDialogProps = Readonly<{
  mode: "create" | "edit";
  initialValue?: AppUser;
  disableRole?: boolean;
  onClose: () => void;
  onSubmit: (input: UserFormValues) => Promise<void>;
}>;

export function UserFormDialog({
  mode,
  initialValue,
  disableRole,
  onClose,
  onSubmit,
}: UserFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (field: string) => String(data.get(field) ?? "").trim();
    const password = value("password");
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        username: mode === "create" ? value("username") : undefined,
        email: value("email") || undefined,
        name: value("name"),
        role: value("role") as Role,
        password: password || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      as="form"
      onSubmit={handleSubmit}
      eyebrow={mode === "create" ? "New user" : "Edit user"}
      title={mode === "create" ? "Add user" : (initialValue?.name ?? "User")}
      description="Admin-only access management."
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {mode === "create" ? "Create user" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <FormField label="Full name">
          <input name="name" required defaultValue={initialValue?.name} />
        </FormField>
        {mode === "create" && (
          <FormField label="Username">
            <input name="username" required minLength={3} />
          </FormField>
        )}
        <FormField label="Email (optional)">
          <input name="email" type="email" defaultValue={initialValue?.email} />
        </FormField>
        <FormField label="Role">
          <select name="role" defaultValue={initialValue?.role ?? "HR"} disabled={disableRole}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={mode === "create" ? "Password" : "New password (optional)"}>
          <input
            name="password"
            type="password"
            minLength={8}
            required={mode === "create"}
            placeholder={mode === "edit" ? "Leave blank to keep current" : undefined}
          />
        </FormField>
      </div>
      {disableRole && <p className="muted">You cannot change your own role.</p>}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
