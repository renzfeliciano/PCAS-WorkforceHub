import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { AppUser } from "@/types/user";

export function DeactivateUserDialog({
  user,
  onClose,
  onConfirm,
}: Readonly<{ user: AppUser; onClose: () => void; onConfirm: () => void }>) {
  return (
    <ConfirmDialog
      eyebrow="Revoke access"
      title={`Deactivate ${user.name}?`}
      description="They will no longer be able to sign in. You can reactivate this account later."
      confirmLabel="Deactivate user"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
