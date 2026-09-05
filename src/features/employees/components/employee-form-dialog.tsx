"use client";

import { useState } from "react";
import { Save, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
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

export function EmployeeFormDialog({
  mode,
  initialValue,
  onClose,
  onSubmit,
}: EmployeeFormDialogProps) {
  const { activeItems: positions, isLoading: positionsLoading } = useCatalogOptions("position");
  const { activeItems: projects, isLoading: projectsLoading } = useCatalogOptions("project");
  const { activeItems: statuses, isLoading: statusesLoading } = useCatalogOptions(
    "status",
    EMPLOYMENT_STATUS_CATEGORY,
  );
  const { validate, handleChange, fieldError, applyServerErrors } = useInlineFormValidation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sssNumber, setSssNumber] = useState(initialValue?.sssNumber ?? "");
  const [philHealthNumber, setPhilHealthNumber] = useState(
    initialValue?.philHealthNumber ?? "",
  );
  const [pagIbigNumber, setPagIbigNumber] = useState(initialValue?.pagIbigNumber ?? "");
  const [tinNumber, setTinNumber] = useState(initialValue?.tinNumber ?? "");
  const [contactNumber, setContactNumber] = useState(initialValue?.contactNumber ?? "09");
  const [employmentStatus, setEmploymentStatus] = useState(initialValue?.employmentStatus ?? "");

  const showEndOfContract = needsEndOfContract(employmentStatus);
  const showLastDay = needsLastDay(employmentStatus);

  const staleValue = (current: string | undefined, activeNames: string[]) =>
    current && !activeNames.includes(current) ? current : undefined;
  const stalePosition = staleValue(
    initialValue?.position,
    positions.map((item) => item.name),
  );
  const staleProject = staleValue(
    initialValue?.projectSite,
    projects.map((item) => item.name),
  );
  const staleStatus = staleValue(
    initialValue?.employmentStatus,
    statuses.map((item) => item.name),
  );

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (!validate(event.currentTarget)) return;
    const data = new FormData(event.currentTarget);
    const value = (field: string) => String(data.get(field) ?? "").trim();
    const input: EmployeeInput = {
      employeeNumber: value("employeeNumber"),
      name: value("name"),
      gender: value("gender") as EmployeeInput["gender"],
      position: value("position"),
      projectSite: value("projectSite"),
      employmentStatus: value("employmentStatus"),
      dateHired: value("dateHired"),
      endOfContract: showEndOfContract ? value("endOfContract") : null,
      lastDay: showLastDay ? value("lastDay") : null,
      contactNumber,
      address: value("address"),
      sssNumber,
      philHealthNumber,
      pagIbigNumber,
      tinNumber,
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
      title={mode === "create" ? "Add employee" : `Edit ${initialValue?.name ?? "employee"}`}
      description={
        initialValue
          ? `${initialValue.employeeNumber} · ${initialValue.position}`
          : "Employment, contact, and statutory ID details."
      }
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
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
        <FormField
          label="Employee number"
          name="employeeNumber"
          error={fieldError("employeeNumber")}
        >
          <input
            name="employeeNumber"
            required
            maxLength={20}
            placeholder="e.g. WH-2026-001"
            defaultValue={initialValue?.employeeNumber}
          />
        </FormField>
        <FormField label="Employee name" name="name" error={fieldError("name")}>
          <input name="name" required maxLength={30} defaultValue={initialValue?.name} />
        </FormField>
        <FormField label="Gender" name="gender" error={fieldError("gender")}>
          <select name="gender" required defaultValue={initialValue?.gender ?? ""}>
            <option value="" disabled>
              Select gender
            </option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </FormField>
        <FormField label="Position" name="position" error={fieldError("position")}>
          <select
            key={positionsLoading ? "loading" : "loaded"}
            name="position"
            required
            defaultValue={initialValue?.position ?? ""}
          >
            <option value="" disabled>
              Select a position
            </option>
            {stalePosition && (
              <option value={stalePosition}>{stalePosition} (inactive)</option>
            )}
            {positions.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Project / site" name="projectSite" error={fieldError("projectSite")}>
          <select
            key={projectsLoading ? "loading" : "loaded"}
            name="projectSite"
            required
            defaultValue={initialValue?.projectSite ?? ""}
          >
            <option value="" disabled>
              Select a project/site
            </option>
            {staleProject && <option value={staleProject}>{staleProject} (inactive)</option>}
            {projects.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Employment status"
          name="employmentStatus"
          error={fieldError("employmentStatus")}
        >
          <select
            name="employmentStatus"
            required
            value={employmentStatus}
            onChange={(event) => setEmploymentStatus(event.target.value)}
          >
            <option value="" disabled>
              Select a status
            </option>
            {staleStatus && <option value={staleStatus}>{staleStatus} (inactive)</option>}
            {statusesLoading && employmentStatus && (
              <option value={employmentStatus}>{employmentStatus}</option>
            )}
            {statuses.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Date hired" name="dateHired" error={fieldError("dateHired")}>
          <input type="date" name="dateHired" required defaultValue={initialValue?.dateHired} />
        </FormField>
        {showEndOfContract && (
          <FormField
            label="End of contract"
            name="endOfContract"
            error={fieldError("endOfContract")}
          >
            <input
              type="date"
              name="endOfContract"
              required
              defaultValue={initialValue?.endOfContract}
            />
          </FormField>
        )}
        {showLastDay && (
          <FormField label="Last day" name="lastDay" error={fieldError("lastDay")}>
            <input
              type="date"
              name="lastDay"
              required
              defaultValue={initialValue?.lastDay}
            />
          </FormField>
        )}
        <FormField
          label="Contact number"
          name="contactNumber"
          error={fieldError("contactNumber")}
        >
          <input
            name="contactNumber"
            required
            inputMode="numeric"
            placeholder="09XX-XXX-XXXX"
            title="Format: 09XX-XXX-XXXX"
            pattern="\d{4}-\d{3}-\d{4}"
            maxLength={13}
            value={contactNumber}
            onChange={(event) => setContactNumber(formatContactNumber(event.target.value))}
          />
        </FormField>
        <FormField label="Address" name="address" error={fieldError("address")} fullWidth>
          <textarea
            name="address"
            required
            rows={4}
            maxLength={255}
            defaultValue={initialValue?.address}
          />
        </FormField>
        <FormField label="SSS no." name="sssNumber" error={fieldError("sssNumber")}>
          <input
            name="sssNumber"
            required
            inputMode="numeric"
            placeholder="XX-XXXXXXX-X"
            title="Format: XX-XXXXXXX-X"
            pattern="\d{2}-\d{7}-\d{1}"
            maxLength={12}
            value={sssNumber}
            onChange={(event) => setSssNumber(formatSssNumber(event.target.value))}
          />
        </FormField>
        <FormField
          label="PhilHealth no."
          name="philHealthNumber"
          error={fieldError("philHealthNumber")}
        >
          <input
            name="philHealthNumber"
            required
            inputMode="numeric"
            placeholder="XX-XXXXXXXXX-X"
            title="Format: XX-XXXXXXXXX-X"
            pattern="\d{2}-\d{9}-\d{1}"
            maxLength={14}
            value={philHealthNumber}
            onChange={(event) => setPhilHealthNumber(formatPhilHealthNumber(event.target.value))}
          />
        </FormField>
        <FormField label="Pag-ibig no." name="pagIbigNumber" error={fieldError("pagIbigNumber")}>
          <input
            name="pagIbigNumber"
            required
            inputMode="numeric"
            placeholder="XXXX-XXXX-XXXX"
            title="Format: XXXX-XXXX-XXXX"
            pattern="\d{4}-\d{4}-\d{4}"
            maxLength={14}
            value={pagIbigNumber}
            onChange={(event) => setPagIbigNumber(formatPagIbigNumber(event.target.value))}
          />
        </FormField>
        <FormField label="TIN no." name="tinNumber" error={fieldError("tinNumber")}>
          <input
            name="tinNumber"
            required
            inputMode="numeric"
            placeholder="XXX-XXX-XXX"
            title="Format: XXX-XXX-XXX or XXX-XXX-XXX-XXX"
            pattern="\d{3}-\d{3}-\d{3}(-\d{3})?"
            maxLength={15}
            value={tinNumber}
            onChange={(event) => setTinNumber(formatTinNumber(event.target.value))}
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
