"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ApiRequestError } from "@/lib/api-client";
import { profileClient } from "@/features/profile/api/profile-client";

type MyProfileModuleProps = Readonly<{
  name: string;
  username: string;
  role: string;
  mustChangePassword: boolean;
}>;

type PasswordFieldName = "currentPassword" | "newPassword" | "confirmPassword";

const PASSWORD_FIELDS: Array<{
  name: PasswordFieldName;
  label: string;
  autoComplete: string;
  minLength?: number;
  hint?: string;
}> = [
  { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
  {
    name: "newPassword",
    label: "New password",
    autoComplete: "new-password",
    minLength: 8,
    hint: "At least 8 characters.",
  },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    autoComplete: "new-password",
    minLength: 8,
  },
];

export function MyProfileModule({ name, username, role, mustChangePassword }: MyProfileModuleProps) {
  const router = useRouter();
  const { update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Set<PasswordFieldName>>(new Set());

  function toggleVisible(field: PasswordFieldName) {
    setVisibleFields((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    // Captured before any `await` — React may null out the synthetic event
    // (or its currentTarget) once the handler yields, so this reference
    // must be taken synchronously rather than read again after an await.
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    setError("");
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await profileClient.changePassword(currentPassword, newPassword);
      // Re-validates the JWT against the DB immediately (see auth.ts's jwt
      // callback) so mustChangePassword flips to false without needing a
      // fresh login — otherwise middleware would keep redirecting here.
      await update();
      setSuccess(true);
      setVisibleFields(new Set());
      form.reset();
      if (mustChangePassword) router.replace("/");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="settings-page profile-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Your account</p>
          <h1>My Profile</h1>
          <p className="muted">Manage your sign-in details and password.</p>
        </div>
        <span className="role-badge">
          <ShieldCheck size={15} /> {role} access
        </span>
      </div>

      <section className="profile-hero">
        <Avatar name={name} tone="coral" />
        <div>
          <h2>{name}</h2>
          <p className="muted">@{username}</p>
        </div>
      </section>

      {mustChangePassword && (
        <div className="profile-alert profile-alert-warning" role="alert">
          <ShieldAlert size={17} />
          <div>
            <b>Update your password to continue</b>
            <p>
              You&apos;re signing in with the default password issued when your account was
              created. Set a new one below to unlock the rest of WorkforceHub.
            </p>
          </div>
        </div>
      )}
      {error && (
        <div className="profile-alert profile-alert-error" role="alert">
          <ShieldAlert size={17} />
          <p>{error}</p>
        </div>
      )}
      {success && !mustChangePassword && (
        <div className="profile-alert profile-alert-success" role="status">
          <CheckCircle2 size={17} />
          <p>Password changed.</p>
        </div>
      )}

      <section className="settings-card profile-card">
        <div className="settings-card-head">
          <div>
            <h2>Change password</h2>
            <p className="muted">You&apos;ll stay signed in — no need to log back in.</p>
          </div>
        </div>
        <form className="form-grid profile-security-form" onSubmit={handleSubmit}>
          {PASSWORD_FIELDS.map((field) => (
            <label key={field.name} className="password-field">
              <span className="field-label">
                {field.label}
                <span className="required-asterisk" aria-hidden="true">
                  {" "}
                  *
                </span>
              </span>
              <div className="password-input-group">
                <input
                  type={visibleFields.has(field.name) ? "text" : "password"}
                  name={field.name}
                  required
                  minLength={field.minLength}
                  autoComplete={field.autoComplete}
                  data-testid={`field-${field.name}`}
                />
                <button
                  type="button"
                  className="password-input-toggle"
                  onClick={() => toggleVisible(field.name)}
                  aria-label={visibleFields.has(field.name) ? "Hide password" : "Show password"}
                >
                  {visibleFields.has(field.name) ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {field.hint && <small className="field-hint">{field.hint}</small>}
            </label>
          ))}
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText="Changing password"
          >
            <KeyRound size={14} /> Change password
          </Button>
        </form>
      </section>
    </div>
  );
}
