"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { EditSettingDialog } from "@/features/settings/components/edit-setting-dialog";
import { DeleteSettingDialog } from "@/features/settings/components/delete-setting-dialog";
import type { SettingItem, SettingKind } from "@/types/settings";

type SettingsCatalogSectionProps = Readonly<{
  kind: SettingKind;
  label: string;
  items: SettingItem[];
  category?: string;
  seedEnabled: boolean;
  onCreate: (input: { name: string; kind: SettingKind; category?: string }) => Promise<void>;
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
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<SettingItem | null>(null);
  const [deleting, setDeleting] = useState<SettingItem | null>(null);

  const activeCount = items.filter((item) => item.active).length;
  const inactiveCount = items.length - activeCount;

  async function handleAdd(event: { preventDefault(): void }) {
    event.preventDefault();
    const value = name.trim();
    if (!value) {
      setError("Enter a name before adding this option.");
      return;
    }
    if (items.some((item) => item.name.toLowerCase() === value.toLowerCase())) {
      setError("This option already exists.");
      return;
    }
    try {
      await onCreate({ name: value, kind, category });
      setName("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
          <span className="settings-count">{items.length}</span>
          {seedEnabled && (
            <button className="seed-button" type="button" onClick={onSeed}>
              Seed defaults
            </button>
          )}
        </div>
      </div>
      <form className="setting-form" onSubmit={handleAdd}>
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          placeholder={`Add a new ${label.toLowerCase()} option`}
          aria-label={`New ${label} name`}
        />
        {error && (
          <span className="inline-error" role="alert">
            {error}
          </span>
        )}
        <button className="button primary" type="submit">
          <Plus size={15} /> Add
        </button>
      </form>
      <div className="setting-list">
        {items.map((item) => (
          <div className="setting-row" key={item.id}>
            <span className="setting-dot" />
            <div>
              <b>{item.name}</b>
              {item.description && <small>{item.description}</small>}
            </div>
            <button
              type="button"
              className={`setting-state ${item.active ? "enabled" : "disabled"}`}
              onClick={() => onToggle(item.id, !item.active)}
            >
              {item.active ? "Active" : "Inactive"}
            </button>
            <button
              type="button"
              className="edit-setting"
              onClick={() => setEditing(item)}
              aria-label={`Edit ${item.name}`}
            >
              Edit
            </button>
            <button
              type="button"
              className="delete-setting"
              onClick={() => setDeleting(item)}
              aria-label={`Delete ${item.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {editing && (
        <EditSettingDialog
          item={editing}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
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
        />
      )}
    </section>
  );
}
