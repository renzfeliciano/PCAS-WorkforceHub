"use client";

import { useState } from "react";
import { CalendarPlus, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { EmptyState } from "@/components/ui/empty-state";
import { useCatalogOptions } from "@/hooks/use-catalog-options";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
import { ApiRequestError } from "@/lib/api-client";
import { eventCategoryTone } from "@/lib/event-category-tone";
import { EVENT_CATEGORY_CATEGORY } from "@/types/catalog";
import type { EventInput } from "@/schemas/event";
import type { WorkforceEvent } from "@/types/event";

type View = { mode: "list" } | { mode: "create" } | { mode: "edit"; event: WorkforceEvent };

type EventDayDialogProps = Readonly<{
  date: string;
  events: WorkforceEvent[];
  canManage: boolean;
  onClose: () => void;
  onCreate: (input: EventInput) => Promise<void>;
  onUpdate: (id: string, input: EventInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}>;

const formattedDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export function EventDayDialog({
  date,
  events,
  canManage,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: EventDayDialogProps) {
  const [view, setView] = useState<View>({ mode: "list" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listError, setListError] = useState("");

  async function handleDelete(event: WorkforceEvent) {
    setDeletingId(event.id);
    setListError("");
    try {
      await onDelete(event.id);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  if (view.mode === "list") {
    return (
      <Modal
        eyebrow="Events"
        title={formattedDate(date)}
        onClose={onClose}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            {canManage && (
              <Button
                type="button"
                variant="primary"
                onClick={() => setView({ mode: "create" })}
                data-testid="add-event"
              >
                <Plus size={14} /> Add event
              </Button>
            )}
          </>
        }
      >
        {events.length === 0 ? (
          <EmptyState title="No events yet" description="Add one to mark it on the calendar." />
        ) : (
          <ul className="setting-list">
            {events.map((event) => (
              <li className="setting-row" key={event.id} data-testid={`event-row-${event.id}`}>
                <span className={`setting-dot tone-${eventCategoryTone(event.category)}`} />
                <div>
                  <b>{event.title}</b>
                  <small>
                    {event.time ? `${event.time} · ` : ""}
                    {event.category}
                    {event.description ? ` · ${event.description}` : ""}
                  </small>
                </div>
                {canManage && (
                  <>
                    <button
                      type="button"
                      className="edit-setting"
                      onClick={() => setView({ mode: "edit", event })}
                      aria-label={`Edit ${event.time ? `${event.time} ` : ""}${event.title}`}
                      title="Edit"
                      data-testid={`edit-event-${event.id}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="delete-setting"
                      onClick={() => handleDelete(event)}
                      aria-label={`Delete ${event.time ? `${event.time} ` : ""}${event.title}`}
                      title="Delete"
                      disabled={deletingId === event.id}
                      data-testid={`delete-event-${event.id}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {listError && (
          <p className="inline-error" role="alert">
            {listError}
          </p>
        )}
      </Modal>
    );
  }

  return (
    <EventForm
      date={date}
      initialValue={view.mode === "edit" ? view.event : undefined}
      onBack={() => setView({ mode: "list" })}
      onClose={onClose}
      onSubmit={async (input) => {
        if (view.mode === "edit") {
          await onUpdate(view.event.id, input);
        } else {
          await onCreate(input);
        }
        setView({ mode: "list" });
      }}
    />
  );
}

type EventFormProps = Readonly<{
  date: string;
  initialValue?: WorkforceEvent;
  onBack: () => void;
  onClose: () => void;
  onSubmit: (input: EventInput) => Promise<void>;
}>;

function EventForm({ date, initialValue, onBack, onClose, onSubmit }: EventFormProps) {
  const { activeItems: categories, isLoading: categoriesLoading } = useCatalogOptions(
    "status",
    EVENT_CATEGORY_CATEGORY,
  );
  const { validate, handleChange, fieldError, applyServerErrors } = useInlineFormValidation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const categoryOptions: SelectOption[] = categories.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  // Guarded by `!isLoading` — see the same pattern (and why) in
  // employee-form-dialog.tsx's stalePosition/staleProject/staleStatus.
  const staleCategory =
    initialValue?.categoryId &&
    !categoriesLoading &&
    !categories.some((item) => item.id === initialValue.categoryId)
      ? initialValue.categoryId
      : undefined;

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (!validate(event.currentTarget)) return;
    const data = new FormData(event.currentTarget);
    const time = String(data.get("time") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        title: String(data.get("title") ?? "").trim(),
        date,
        time: time || undefined,
        categoryId: String(data.get("categoryId") ?? "").trim(),
        description: description || undefined,
      });
    } catch (err) {
      if (err instanceof ApiRequestError && err.fieldErrors) {
        applyServerErrors(err.fieldErrors);
        setError("Check the highlighted fields and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      as="form"
      onSubmit={handleSubmit}
      onChange={handleChange}
      eyebrow={initialValue ? "Edit event" : "New event"}
      title={formattedDate(date)}
      onClose={onClose}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onBack}
            disabled={isSubmitting}
            data-testid="back-event-form"
          >
            Back
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={initialValue ? "Saving changes" : "Adding event"}
            data-testid="submit-event-form"
          >
            {initialValue ? (
              <>
                <Save size={14} /> Save changes
              </>
            ) : (
              <>
                <CalendarPlus size={14} /> Add event
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <TextField
          name="title"
          label="Title"
          fullWidth
          required
          maxLength={120}
          defaultValue={initialValue?.title}
          placeholder="e.g. Town hall meeting"
          error={fieldError("title")}
        />
        <TextField name="time" label="Time" type="time" defaultValue={initialValue?.time} />
        <SelectField
          name="categoryId"
          label="Category"
          options={categoryOptions}
          placeholder="Select a category"
          extraOptions={
            staleCategory
              ? [{ value: staleCategory, label: `${initialValue?.category} (inactive)` }]
              : undefined
          }
          required
          defaultValue={initialValue?.categoryId ?? ""}
          remountKey={categoriesLoading ? "loading" : "loaded"}
          error={fieldError("categoryId")}
        />
        <TextField
          name="description"
          label="Description"
          fullWidth
          maxLength={500}
          defaultValue={initialValue?.description}
          placeholder="e.g. Bring your own laptop for the workshop"
        />
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
