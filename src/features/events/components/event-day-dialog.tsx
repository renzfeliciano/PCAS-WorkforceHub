"use client";

import { useState } from "react";
import { CalendarPlus, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { EmptyState } from "@/components/ui/empty-state";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
import { ApiRequestError } from "@/lib/api-client";
import { eventCategoryTone } from "@/lib/event-category-tone";
import { EVENT_CATEGORIES } from "@/schemas/event";
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
              <Button type="button" variant="primary" onClick={() => setView({ mode: "create" })}>
                <Plus size={14} /> Add event
              </Button>
            )}
          </>
        }
      >
        {events.length === 0 ? (
          <EmptyState title="No events yet" description="Add one to mark it on the calendar." />
        ) : (
          <div className="setting-list">
            {events.map((event) => (
              <div className="setting-row" key={event.id}>
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
                      aria-label={`Edit ${event.title}`}
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="delete-setting"
                      onClick={() => handleDelete(event)}
                      aria-label={`Delete ${event.title}`}
                      title="Delete"
                      disabled={deletingId === event.id}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
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
  const { validate, handleChange, fieldError, applyServerErrors } = useInlineFormValidation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
        category: String(data.get("category")) as EventInput["category"],
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
          <Button type="button" variant="secondary" onClick={onBack} disabled={isSubmitting}>
            Back
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={initialValue ? "Saving changes" : "Adding event"}
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
        <FormField label="Title" name="title" fullWidth error={fieldError("title")}>
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={initialValue?.title}
            placeholder="e.g. Town hall meeting"
          />
        </FormField>
        <FormField label="Time" name="time">
          <input type="time" name="time" defaultValue={initialValue?.time} />
        </FormField>
        <FormField label="Category" name="category" error={fieldError("category")}>
          <select name="category" required defaultValue={initialValue?.category ?? EVENT_CATEGORIES[0]}>
            {EVENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Description" name="description" fullWidth>
          <input
            name="description"
            maxLength={500}
            defaultValue={initialValue?.description}
            placeholder="Optional"
          />
        </FormField>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
