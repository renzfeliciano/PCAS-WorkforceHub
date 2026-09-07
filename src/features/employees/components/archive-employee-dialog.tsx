import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Employee } from "@/types/employee";

export function ArchiveEmployeeDialog({
  employee,
  onClose,
  onConfirm,
}: Readonly<{ employee: Employee; onClose: () => void; onConfirm: () => void }>) {
  return (
    <ConfirmDialog
      eyebrow="Archive record"
      title={`Archive ${employee.name}?`}
      description="This removes the employee from the active roster. You can restore them later from the archived view."
      confirmLabel="Archive employee"
      confirmLoadingLabel="Archiving employee"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
