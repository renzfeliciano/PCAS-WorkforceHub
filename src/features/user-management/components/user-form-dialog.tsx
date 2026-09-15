"use client";

import { useState } from "react";
import { Save, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { EmailField } from "@/components/ui/email-field";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
import type { AppUser, Role } from "@/types/user";

const ROLES: Role[] = ["Admin", "HR", "Manager", "Employee"];
const ROLE_OPTIONS: SelectOption[] = ROLES.map((role) => ({ value: role, label: role }));

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
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="cancel-user-form"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={mode === "create" ? "Creating user" : "Saving changes"}
            data-testid="submit-user-form"
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
        <TextField
          name="name"
          label="Full name"
          required
          placeholder="e.g. Juan Dela Cruz"
          autoComplete="off"
          defaultValue={initialValue?.name}
          error={fieldError("name")}
        />
        <TextField
          name="username"
          label="Username"
          required
          minLength={3}
          placeholder="e.g. juan.delacruz"
          autoComplete="off"
          defaultValue={initialValue?.username}
          error={fieldError("username")}
        />
        <EmailField
          defaultValue={initialValue?.email}
          error={fieldError("email")}
          autoComplete="off"
        />
        <SelectField
          name="role"
          label="Role"
          options={ROLE_OPTIONS}
          defaultValue={initialValue?.role ?? "HR"}
          disabled={disableRole}
          error={fieldError("role")}
        />
        <TextField
          name="password"
          label={mode === "create" ? "Password" : "New password"}
          type="password"
          minLength={8}
          required={mode === "create"}
          autoComplete="new-password"
          placeholder={mode === "edit" ? "Leave blank to keep current" : undefined}
          error={fieldError("password")}
        />
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
