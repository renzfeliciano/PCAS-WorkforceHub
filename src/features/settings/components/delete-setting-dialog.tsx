import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SettingItem } from "@/types/settings";

export function DeleteSettingDialog({
  item,
  onClose,
  onConfirm,
  onDeactivate,
}: Readonly<{
  item: SettingItem;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onDeactivate?: () => Promise<void>;
}>) {
  return (
    <ConfirmDialog
      eyebrow="Permanent deletion"
      title={`Delete ${item.name}?`}
      description={`This permanently removes the ${item.kind} from Settings and cannot be undone. Deactivate it instead if existing employee records still reference it.`}
      confirmLabel="Delete permanently"
      onClose={onClose}
      onConfirm={onConfirm}
      onDeactivate={item.active ? onDeactivate : undefined}
    />
  );
}
