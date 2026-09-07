"use client";

import { useState } from "react";
import { Save, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
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
  const { validate, handleChange, fieldError } = useInlineFormValidation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (!validate(event.currentTarget)) return;
    const data = new FormData(event.currentTarget);
    const value = (field: string) => String(data.get(field) ?? "").trim();
    const password = value("password");
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        username: value("username"),
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
      onChange={handleChange}
      eyebrow={mode === "create" ? "New user" : "Edit user"}
      title={mode === "create" ? "Add user" : (initialValue?.name ?? "User")}
      description="Admin-only access management."
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={mode === "create" ? "Creating user" : "Saving changes"}
          >
            {mode === "create" ? (
              <>
                <UserPlus size={14} /> Create user
              </>
            ) : (
              <>
                <Save size={14} /> Save changes
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <FormField label="Full name" name="name" error={fieldError("name")}>
          <input name="name" required autoComplete="off" defaultValue={initialValue?.name} />
        </FormField>
        <FormField label="Username" name="username" error={fieldError("username")}>
          <input
            name="username"
            required
            minLength={3}
            autoComplete="off"
            defaultValue={initialValue?.username}
          />
        </FormField>
        <FormField label="Email (optional)" name="email" error={fieldError("email")}>
          <input name="email" type="email" autoComplete="off" defaultValue={initialValue?.email} />
        </FormField>
        <FormField label="Role" name="role" error={fieldError("role")}>
          <select name="role" defaultValue={initialValue?.role ?? "HR"} disabled={disableRole}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label={mode === "create" ? "Password" : "New password (optional)"}
          name="password"
          error={fieldError("password")}
        >
          <input
            name="password"
            type="password"
            minLength={8}
            required={mode === "create"}
            autoComplete="new-password"
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
