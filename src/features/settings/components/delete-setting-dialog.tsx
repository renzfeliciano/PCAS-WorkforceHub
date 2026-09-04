import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SettingItem } from "@/types/settings";

export function DeleteSettingDialog({
  item,
  onClose,
  onConfirm,
}: Readonly<{ item: SettingItem; onClose: () => void; onConfirm: () => void }>) {
  return (
    <ConfirmDialog
      eyebrow="Permanent deletion"
      title={`Delete ${item.name}?`}
      description={`This removes the ${item.kind} from Settings. Deactivate it instead when existing employee records still reference it.`}
      confirmLabel="Delete permanently"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
