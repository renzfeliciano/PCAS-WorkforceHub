"use client";

import { useState } from "react";
import { Save, Scale } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { RemarksField } from "@/components/ui/remarks-field";
import { useCatalogOptions } from "@/hooks/use-catalog-options";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
import { ApiRequestError } from "@/lib/api-client";
import { CASE_CLASSIFICATION_CATEGORY, CASE_STATUS_CATEGORY } from "@/types/settings";
import type { CaseRecordInput } from "@/schemas/case-record";
import type { CaseRecord } from "@/types/case-record";

type CaseRecordFormDialogProps = Readonly<{
  mode: "create" | "edit";
  initialValue?: CaseRecord;
  onClose: () => void;
  onSubmit: (input: CaseRecordInput) => Promise<void>;
}>;

function catalogOptions(items: { id: string; name: string }[]): SelectOption[] {
  return items.map((item) => ({ value: item.id, label: item.name }));
}

/** A catalog value the record still points at that's since gone inactive — kept selectable so editing doesn't silently reassign it. */
function staleOption(currentId: string | undefined, items: { id: string }[], label: string | undefined) {
  return currentId && label && !items.some((item) => item.id === currentId)
    ? [{ value: currentId, label: `${label} (inactive)` }]
    : undefined;
}

export function CaseRecordFormDialog({
  mode,
  initialValue,
  onClose,
  onSubmit,
}: CaseRecordFormDialogProps) {
  const { validate, handleChange, fieldError, applyServerErrors } = useInlineFormValidation();
  const { activeItems: projects, isLoading: projectsLoading } = useCatalogOptions("project");
  const { activeItems: classifications, isLoading: classificationsLoading } = useCatalogOptions(
    "status",
    CASE_CLASSIFICATION_CATEGORY,
  );
  const { activeItems: statuses, isLoading: statusesLoading } = useCatalogOptions(
    "status",
    CASE_STATUS_CATEGORY,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const catalogsLoading = projectsLoading || classificationsLoading || statusesLoading;

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (!validate(event.currentTarget)) return;
    const data = new FormData(event.currentTarget);
    const value = (field: string) => String(data.get(field) ?? "").trim();
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        projectId: value("projectId"),
        caseName: value("caseName"),
        caseNumber: value("caseNumber"),
        classificationId: value("classificationId"),
        statusId: value("statusId"),
        legalCounsel: value("legalCounsel") || undefined,
        briefHistory: value("briefHistory") || undefined,
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
      eyebrow={mode === "create" ? "New case" : "Edit case"}
      title="Case monitoring"
      description="Track a legal, labor, or regulatory case against the company."
      onClose={onClose}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="cancel-case-record-form"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={mode === "create" ? "Adding case" : "Saving changes"}
            data-testid="submit-case-record-form"
          >
            {mode === "create" ? (
              <>
                <Scale size={14} /> Add case
              </>
            ) : (
              <>
                <Save size={14} /> Save changes
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <SelectField
          name="projectId"
          label="Project"
          options={catalogOptions(projects)}
          extraOptions={staleOption(initialValue?.projectId, projects, initialValue?.project)}
          placeholder="Select a project"
          defaultValue={initialValue?.projectId ?? ""}
          required
          remountKey={catalogsLoading ? "loading" : "loaded"}
          error={fieldError("projectId")}
        />
        <TextField
          name="caseNumber"
          label="Case number"
          required
          maxLength={80}
          defaultValue={initialValue?.caseNumber}
          placeholder="e.g. NLRC-NCR-01-00123-26"
          error={fieldError("caseNumber")}
        />
        <TextField
          name="caseName"
          label="Case name"
          required
          maxLength={160}
          defaultValue={initialValue?.caseName}
          placeholder="e.g. Dela Cruz vs. PCAS Corp"
          fullWidth
          error={fieldError("caseName")}
        />
        <SelectField
          name="classificationId"
          label="Case classification"
          options={catalogOptions(classifications)}
          extraOptions={staleOption(initialValue?.classificationId, classifications, initialValue?.classification)}
          placeholder="Select a classification"
          defaultValue={initialValue?.classificationId ?? ""}
          required
          remountKey={catalogsLoading ? "loading" : "loaded"}
          error={fieldError("classificationId")}
        />
        <SelectField
          name="statusId"
          label="Case status"
          options={catalogOptions(statuses)}
          extraOptions={staleOption(initialValue?.statusId, statuses, initialValue?.status)}
          placeholder="Select a status"
          defaultValue={initialValue?.statusId ?? ""}
          required
          remountKey={catalogsLoading ? "loading" : "loaded"}
          error={fieldError("statusId")}
        />
        <TextField
          name="legalCounsel"
          label="Legal counsel"
          maxLength={120}
          defaultValue={initialValue?.legalCounsel}
          placeholder="e.g. Atty. Juan Dela Cruz"
          fullWidth
          error={fieldError("legalCounsel")}
        />
        <RemarksField
          name="briefHistory"
          label="Brief history"
          maxLength={2000}
          defaultValue={initialValue?.briefHistory}
          placeholder="Summarize the case background and current developments"
          fullWidth
          error={fieldError("briefHistory")}
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
