"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  LeaveTypeFormDialog,
  type LeaveTypeFormValues,
} from "@/features/settings/components/leave-type-form-dialog";
import type { LeaveType } from "@/types/leave-type";

type LeaveTypesSectionProps = Readonly<{
  items: LeaveType[];
  seedEnabled: boolean;
  onCreate: (input: LeaveTypeFormValues) => Promise<void>;
  onUpdate: (id: string, input: Partial<LeaveTypeFormValues> & { active?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSeed: () => Promise<void>;
}>;

export function LeaveTypesSection({
  items,
  seedEnabled,
  onCreate,
  onUpdate,
  onDelete,
  onSeed,
}: LeaveTypesSectionProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [deleting, setDeleting] = useState<LeaveType | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleSeed() {
    setIsSeeding(true);
    try {
      await onSeed();
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleToggle(item: LeaveType) {
    setTogglingId(item.id);
    try {
      await onUpdate(item.id, { active: !item.active });
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <section className="settings-card">
      <div className="settings-card-head">
        <div>
          <h2>Leave types</h2>
          <p className="muted">Offsets, maternity, paternity, and other leave categories.</p>
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
          <Button type="button" variant="primary" onClick={() => setAdding(true)}>
            <Plus size={14} /> Add
          </Button>
        </div>
      </div>
      <div className="setting-list">
        {items.map((item) => (
          <div className="setting-row" key={item.id}>
            <div className="setting-row-name">
              <span className="setting-dot" />
              <div>
                <b>{item.name}</b>
                <small>
                  {item.code} · {item.eligibility === "Any" ? "All employees" : `${item.eligibility} only`}
                </small>
              </div>
            </div>
            <div className="setting-row-actions">
              <button
                type="button"
                className={`setting-state ${item.active ? "enabled" : "disabled"}`}
                onClick={() => handleToggle(item)}
                disabled={togglingId === item.id}
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
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                className="delete-setting"
                onClick={() => setDeleting(item)}
                aria-label={`Delete ${item.name}`}
                title="Delete"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      {adding && (
        <LeaveTypeFormDialog
          mode="create"
          onClose={() => setAdding(false)}
          onSubmit={async (input) => {
            await onCreate(input);
            setAdding(false);
          }}
        />
      )}
      {editing && (
        <LeaveTypeFormDialog
          mode="edit"
          initialValue={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            await onUpdate(editing.id, input);
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          eyebrow="Permanent deletion"
          title={`Delete ${deleting.name}?`}
          description="This permanently removes the leave type from Settings and cannot be undone. Deactivate it instead if existing employee records still reference it."
          confirmLabel="Delete permanently"
          confirmLoadingLabel="Deleting permanently"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await onDelete(deleting.id);
            setDeleting(null);
          }}
          onDeactivate={
            deleting.active
              ? async () => {
                  await onUpdate(deleting.id, { active: false });
                  setDeleting(null);
                }
              : undefined
          }
        />
      )}
    </section>
  );
}
