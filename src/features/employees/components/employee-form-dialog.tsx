"use client";

import { useState } from "react";
import { Save, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { DateField } from "@/components/ui/date-field";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { ContactNumberField } from "@/components/ui/contact-number-field";
import { RemarksField } from "@/components/ui/remarks-field";
import { MaskedInputField } from "@/components/ui/masked-input-field";
import { useCatalogOptions } from "@/hooks/use-catalog-options";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
import { ApiRequestError } from "@/lib/api-client";
import { needsEndOfContract, needsLastDay } from "@/lib/employment-status";
import {
  formatContactNumber,
  formatPagIbigNumber,
  formatPhilHealthNumber,
  formatSssNumber,
  formatTinNumber,
} from "@/lib/input-mask";
import { EMPLOYMENT_STATUS_CATEGORY } from "@/types/settings";
import type { Employee } from "@/types/employee";
import type { EmployeeInput } from "@/schemas/employee";

type EmployeeFormDialogProps = Readonly<{
  mode: "create" | "edit";
  initialValue?: Employee;
  onClose: () => void;
  onSubmit: (input: EmployeeInput) => Promise<void>;
}>;

const GENDER_OPTIONS: SelectOption[] = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

export function EmployeeFormDialog({
  mode,
  initialValue,
  onClose,
  onSubmit,
}: EmployeeFormDialogProps) {
  const { activeItems: positions, isLoading: positionsLoading } =
    useCatalogOptions("position");
  const { activeItems: projects, isLoading: projectsLoading } =
    useCatalogOptions("project");
  const { activeItems: statuses, isLoading: statusesLoading } =
    useCatalogOptions("status", EMPLOYMENT_STATUS_CATEGORY);
  const { validate, handleChange, fieldError, applyServerErrors } =
    useInlineFormValidation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sssNumber, setSssNumber] = useState(
    formatSssNumber(initialValue?.sssNumber ?? ""),
  );
  const [philHealthNumber, setPhilHealthNumber] = useState(
    formatPhilHealthNumber(initialValue?.philHealthNumber ?? ""),
  );
  const [pagIbigNumber, setPagIbigNumber] = useState(
    formatPagIbigNumber(initialValue?.pagIbigNumber ?? ""),
  );
  const [tinNumber, setTinNumber] = useState(
    formatTinNumber(initialValue?.tinNumber ?? ""),
  );
  const [contactNumber, setContactNumber] = useState(
    formatContactNumber(initialValue?.contactNumber ?? ""),
  );
  const [employmentStatusId, setEmploymentStatusId] = useState(
    initialValue?.employmentStatusId ?? "",
  );

  // needsEndOfContract/needsLastDay match on the status's display *name*
  // (see src/lib/employment-status.ts), so the selected id still needs
  // resolving to a name here — from the live catalog once loaded, or from
  // the record's own already-resolved name if the id hasn't changed from
  // what was loaded (covers a status that's since gone inactive).
  const selectedStatusName =
    statuses.find((item) => item.id === employmentStatusId)?.name ??
    (employmentStatusId && employmentStatusId === initialValue?.employmentStatusId
      ? initialValue?.employmentStatus
      : undefined) ??
    "";

  const showEndOfContract = needsEndOfContract(selectedStatusName);
  const showLastDay = needsLastDay(selectedStatusName);

  // Guarded by `!isLoading`: before a catalog has loaded, its active-ids
  // list is still empty, which would otherwise flag the current value as
  // "stale" for one render just because nothing has arrived yet — for
  // employmentStatus specifically, that transient false positive collided
  // with the "keep the current value selectable while loading" option
  // below (both resolved to the same value), producing a duplicate <option>
  // key.
  const staleValue = (
    current: string | undefined,
    activeValues: string[],
    isLoading: boolean,
  ) => (current && !isLoading && !activeValues.includes(current) ? current : undefined);
  const stalePosition = staleValue(
    initialValue?.positionId,
    positions.map((item) => item.id),
    positionsLoading,
  );
  const staleProject = staleValue(
    initialValue?.projectSiteId,
    projects.map((item) => item.id),
    projectsLoading,
  );
  const staleStatus = staleValue(
    initialValue?.employmentStatusId,
    statuses.map((item) => item.id),
    statusesLoading,
  );

  const positionOptions: SelectOption[] = positions.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const projectOptions: SelectOption[] = projects.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const statusOptions: SelectOption[] = statuses.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  // useCatalogOptions' `items` and `isLoading` land in separate renders
  // (its fetch resolves items first, isLoading second), so checking
  // "already covered by a real option" directly — rather than trusting
  // isLoading's exact timing — is what actually prevents the transient
  // duplicate <option> this guards against.
  const employmentStatusAlreadyListed =
    staleStatus === employmentStatusId ||
    statusOptions.some((option) => option.value === employmentStatusId);

  async function handleSubmit(event: {
    preventDefault(): void;
    currentTarget: HTMLFormElement;
  }) {
    event.preventDefault();
    if (!validate(event.currentTarget)) return;
    const data = new FormData(event.currentTarget);
    const value = (field: string) => String(data.get(field) ?? "").trim();
    const input: EmployeeInput = {
      employeeNumber: value("employeeNumber") || null,
      name: value("name"),
      gender: value("gender") as EmployeeInput["gender"],
      positionId: value("positionId"),
      projectSiteId: value("projectSiteId"),
      employmentStatusId: value("employmentStatusId"),
      // Not persisted — see the schema comment on employmentStatusName for
      // why the resolved name still needs to travel with the request.
      employmentStatusName: selectedStatusName,
      dateHired: value("dateHired"),
      birthDate: value("birthDate") || null,
      endOfContract: showEndOfContract ? value("endOfContract") : null,
      lastDay: showLastDay ? value("lastDay") : null,
      contactNumber: contactNumber || null,
      address: value("address") || null,
      sssNumber: sssNumber || null,
      philHealthNumber: philHealthNumber || null,
      pagIbigNumber: pagIbigNumber || null,
      tinNumber: tinNumber || null,
      leaveBalances: initialValue?.leaveBalances ?? [],
    };
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit(input);
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
      className="modal-wide"
      onSubmit={handleSubmit}
      onChange={handleChange}
      eyebrow={mode === "create" ? "New record" : "Edit record"}
      title={
        mode === "create"
          ? "Add employee"
          : `Edit ${initialValue?.name ?? "employee"}`
      }
      description={
        initialValue
          ? [initialValue.employeeNumber, initialValue.position].filter(Boolean).join(" · ")
          : "Employment, contact, and statutory ID details."
      }
      onClose={onClose}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="cancel-employee-form"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={
              mode === "create" ? "Creating employee" : "Saving changes"
            }
            data-testid="submit-employee-form"
          >
            {mode === "create" ? (
              <>
                <UserPlus size={14} /> Create employee
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
        <TextField
          name="employeeNumber"
          label="Employee number"
          maxLength={20}
          placeholder="e.g. WH-2026-001"
          defaultValue={initialValue?.employeeNumber}
          error={fieldError("employeeNumber")}
        />
        <TextField
          name="name"
          label="Employee name"
          required
          maxLength={30}
          placeholder="e.g. Juan Dela Cruz"
          defaultValue={initialValue?.name}
          error={fieldError("name")}
        />
        <SelectField
          name="gender"
          label="Gender"
          options={GENDER_OPTIONS}
          placeholder="Select gender"
          defaultValue={initialValue?.gender ?? ""}
          required
          error={fieldError("gender")}
        />
        <SelectField
          name="positionId"
          label="Position"
          options={positionOptions}
          placeholder="Select a position"
          extraOptions={
            stalePosition
              ? [{ value: stalePosition, label: `${initialValue?.position} (inactive)` }]
              : undefined
          }
          defaultValue={initialValue?.positionId ?? ""}
          required
          remountKey={positionsLoading ? "loading" : "loaded"}
          error={fieldError("positionId")}
        />
        <SelectField
          name="projectSiteId"
          label="Project / site"
          options={projectOptions}
          placeholder="Select a project/site"
          extraOptions={
            staleProject
              ? [{ value: staleProject, label: `${initialValue?.projectSite} (inactive)` }]
              : undefined
          }
          defaultValue={initialValue?.projectSiteId ?? ""}
          required
          remountKey={projectsLoading ? "loading" : "loaded"}
          error={fieldError("projectSiteId")}
        />
        <SelectField
          name="employmentStatusId"
          label="Employment status"
          options={statusOptions}
          placeholder="Select a status"
          extraOptions={[
            ...(staleStatus
              ? [{ value: staleStatus, label: `${initialValue?.employmentStatus} (inactive)` }]
              : []),
            ...(employmentStatusId && !employmentStatusAlreadyListed
              ? [{ value: employmentStatusId, label: selectedStatusName || employmentStatusId }]
              : []),
          ]}
          value={employmentStatusId}
          onChange={(event) => setEmploymentStatusId(event.target.value)}
          required
          error={fieldError("employmentStatusId")}
        />
        <DateField
          name="birthDate"
          label="Birth date"
          defaultValue={initialValue?.birthDate ?? undefined}
          error={fieldError("birthDate")}
        />
        <ContactNumberField
          value={contactNumber}
          onChange={setContactNumber}
          error={fieldError("contactNumber")}
        />
        <DateField
          name="dateHired"
          label="Date hired"
          required
          defaultValue={initialValue?.dateHired}
          error={fieldError("dateHired")}
        />
        {showEndOfContract && (
          <DateField
            name="endOfContract"
            label="End of contract"
            required
            defaultValue={initialValue?.endOfContract ?? undefined}
            error={fieldError("endOfContract")}
          />
        )}
        {showLastDay && (
          <DateField
            name="lastDay"
            label="Last day"
            required
            defaultValue={initialValue?.lastDay ?? undefined}
            error={fieldError("lastDay")}
          />
        )}
        <RemarksField
          name="address"
          label="Address"
          maxLength={255}
          placeholder="e.g. 123 Rizal Street, Brgy. San Isidro, Quezon City"
          defaultValue={initialValue?.address ?? undefined}
          error={fieldError("address")}
        />
        <MaskedInputField
          name="sssNumber"
          label="SSS no."
          value={sssNumber}
          onChange={(next) => setSssNumber(formatSssNumber(next))}
          format={formatSssNumber}
          placeholder="e.g. 34-1234567-8"
          title="Format: XX-XXXXXXX-X"
          pattern="\d{2}-\d{7}-\d{1}"
          maxLength={12}
          error={fieldError("sssNumber")}
        />
        <MaskedInputField
          name="philHealthNumber"
          label="PhilHealth no."
          value={philHealthNumber}
          onChange={(next) => setPhilHealthNumber(formatPhilHealthNumber(next))}
          format={formatPhilHealthNumber}
          placeholder="e.g. 12-345678901-2"
          title="Format: XX-XXXXXXXXX-X"
          pattern="\d{2}-\d{9}-\d{1}"
          maxLength={14}
          error={fieldError("philHealthNumber")}
        />
        <MaskedInputField
          name="pagIbigNumber"
          label="Pag-ibig no."
          value={pagIbigNumber}
          onChange={(next) => setPagIbigNumber(formatPagIbigNumber(next))}
          format={formatPagIbigNumber}
          placeholder="e.g. 1234-5678-9012"
          title="Format: XXXX-XXXX-XXXX"
          pattern="\d{4}-\d{4}-\d{4}"
          maxLength={14}
          error={fieldError("pagIbigNumber")}
        />
        <MaskedInputField
          name="tinNumber"
          label="TIN no."
          value={tinNumber}
          onChange={(next) => setTinNumber(formatTinNumber(next))}
          format={formatTinNumber}
          placeholder="e.g. 123-456-789"
          title="Format: XXX-XXX-XXX or XXX-XXX-XXX-XXX"
          pattern="\d{3}-\d{3}-\d{3}(-\d{3})?"
          maxLength={15}
          error={fieldError("tinNumber")}
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
