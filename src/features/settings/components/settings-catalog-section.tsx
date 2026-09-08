"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SettingFormDialog } from "@/features/settings/components/setting-form-dialog";
import { DeleteSettingDialog } from "@/features/settings/components/delete-setting-dialog";
import type { SettingItem, SettingKind } from "@/types/settings";

type SettingsCatalogSectionProps = Readonly<{
  kind: SettingKind;
  label: string;
  items: SettingItem[];
  category?: string;
  seedEnabled: boolean;
  onCreate: (input: {
    name: string;
    kind: SettingKind;
    category?: string;
  }) => Promise<void>;
  onUpdate: (id: string, input: { name: string }) => Promise<void>;
  onToggle: (id: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSeed: () => Promise<void>;
}>;

export function SettingsCatalogSection({
  kind,
  label,
  items,
  category,
  seedEnabled,
  onCreate,
  onUpdate,
  onToggle,
  onDelete,
  onSeed,
}: SettingsCatalogSectionProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<SettingItem | null>(null);
  const [deleting, setDeleting] = useState<SettingItem | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const activeCount = items.filter((item) => item.active).length;
  const inactiveCount = items.length - activeCount;
  // Naive "strip trailing s" mangles "statuses" -> "statuse"; "-uses" plurals
  // need "-uses" -> "-us" instead. Every other label in this app pluralizes
  // with a plain "s" and is unaffected.
  const singularLabel = label.toLowerCase().endsWith("uses")
    ? label.toLowerCase().replace(/uses$/, "us")
    : label.toLowerCase().replace(/s$/, "");

  async function handleSeed() {
    setIsSeeding(true);
    try {
      await onSeed();
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleToggle(item: SettingItem) {
    setTogglingId(item.id);
    try {
      await onToggle(item.id, !item.active);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <section className="settings-card">
      <div className="settings-card-head">
        <div>
          <h2>{label}</h2>
          <p className="muted">
            {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <div className="settings-card-tools">
          {seedEnabled && (
            <button
              className="seed-button"
              type="button"
              onClick={handleSeed}
              disabled={isSeeding}
            >
              {isSeeding ? <Spinner size={11} /> : "Seed defaults"}
            </button>
          )}
          <Button
            type="button"
            variant="primary"
            onClick={() => setAdding(true)}
            data-testid={`add-catalog-${kind}${category ? `-${category}` : ""}`}
          >
            <Plus size={14} /> Add
          </Button>
        </div>
      </div>
      <ul className="setting-list">
        {items.map((item) => (
          <li className="setting-row" key={item.id} data-testid={`catalog-${kind}-row-${item.id}`}>
            <div className="setting-row-name">
              <span className="setting-dot" />
              <div>
                <b>{item.name}</b>
                {item.description && <small>{item.description}</small>}
              </div>
            </div>
            <div className="setting-row-actions">
              <button
                type="button"
                className={`setting-state ${item.active ? "enabled" : "disabled"}`}
                onClick={() => handleToggle(item)}
                disabled={togglingId === item.id}
                aria-label={`Mark ${item.name} ${item.active ? "inactive" : "active"}`}
                data-testid={`toggle-catalog-${kind}-${item.id}`}
              >
                {togglingId === item.id ? (
                  <Spinner size={11} />
                ) : item.active ? (
                  "Active"
                ) : (
                  "Inactive"
                )}
              </button>
              <button
                type="button"
                className="edit-setting"
                onClick={() => setEditing(item)}
                aria-label={`Edit ${item.name}`}
                title="Edit"
                data-testid={`edit-catalog-${kind}-${item.id}`}
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                className="delete-setting"
                onClick={() => setDeleting(item)}
                aria-label={`Delete ${item.name}`}
                title="Delete"
                data-testid={`delete-catalog-${kind}-${item.id}`}
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
      {adding && (
        <SettingFormDialog
          mode="create"
          label={singularLabel}
          onClose={() => setAdding(false)}
          onSubmit={async ({ name }) => {
            if (
              items.some(
                (item) => item.name.toLowerCase() === name.toLowerCase(),
              )
            )
              throw new Error("This option already exists.");
            await onCreate({ name, kind, category });
            setAdding(false);
          }}
          submitLabel={`Add ${kind}`}
        />
      )}
      {editing && (
        <SettingFormDialog
          mode="edit"
          label={singularLabel}
          initialValue={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            await onUpdate(editing.id, input);
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <DeleteSettingDialog
          item={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await onDelete(deleting.id);
            setDeleting(null);
          }}
          onDeactivate={async () => {
            await onToggle(deleting.id, false);
            setDeleting(null);
          }}
        />
      )}
    </section>
  );
}
