"use client";

import { useState } from "react";
import { Plus, Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useCatalogOptions } from "@/hooks/use-catalog-options";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (field: string) => String(data.get(field) ?? "").trim();
    const input: EmployeeInput = {
      name: value("name"),
      gender: value("gender") as EmployeeInput["gender"],
      position: value("position"),
      projectSite: value("projectSite"),
      employmentStatus: value("employmentStatus"),
      dateHired: value("dateHired"),
      endOfContract: value("endOfContract"),
      contactNumber: value("contactNumber"),
      address: value("address"),
      sssNumber: value("sssNumber"),
      philHealthNumber: value("philHealthNumber"),
      pagIbigNumber: value("pagIbigNumber"),
      tinNumber: value("tinNumber"),
      leaveBalances: initialValue?.leaveBalances ?? [],
    };
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      as="form"
      onSubmit={handleSubmit}
      eyebrow={mode === "create" ? "New record" : "Edit record"}
      title={mode === "create" ? "Add employee" : `Edit ${initialValue?.name ?? "employee"}`}
      description="Employment, contact, and statutory ID details."
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {mode === "create" ? <Plus size={15} /> : <Save size={15} />}
            {mode === "create" ? "Create employee" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <FormField label="Employee name">
          <input name="name" required defaultValue={initialValue?.name} />
        </FormField>
        <FormField label="Gender">
          <select name="gender" required defaultValue={initialValue?.gender ?? ""}>
            <option value="" disabled>
              Select gender
            </option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </FormField>
        <FormField label="Position">
          <select
            key={positionsLoading ? "loading" : "loaded"}
            name="position"
            required
            defaultValue={initialValue?.position ?? ""}
          >
            <option value="" disabled>
              Select a position
            </option>
            {positions.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Project / site">
          <select
            key={projectsLoading ? "loading" : "loaded"}
            name="projectSite"
            required
            defaultValue={initialValue?.projectSite ?? ""}
          >
            <option value="" disabled>
              Select a project/site
            </option>
            {projects.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Employment status">
          <select
            key={statusesLoading ? "loading" : "loaded"}
            name="employmentStatus"
            required
            defaultValue={initialValue?.employmentStatus ?? ""}
          >
            <option value="" disabled>
              Select a status
            </option>
            {statuses.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Date hired">
          <input type="date" name="dateHired" required defaultValue={initialValue?.dateHired} />
        </FormField>
        <FormField label="End of contract">
          <input
            type="date"
            name="endOfContract"
            required
            defaultValue={initialValue?.endOfContract}
          />
        </FormField>
        <FormField label="Contact number">
          <input name="contactNumber" required defaultValue={initialValue?.contactNumber} />
        </FormField>
        <FormField label="Address">
          <input name="address" required defaultValue={initialValue?.address} />
        </FormField>
        <FormField label="SSS no.">
          <input name="sssNumber" required defaultValue={initialValue?.sssNumber} />
        </FormField>
        <FormField label="PhilHealth no.">
          <input name="philHealthNumber" required defaultValue={initialValue?.philHealthNumber} />
        </FormField>
        <FormField label="Pag-ibig no.">
          <input name="pagIbigNumber" required defaultValue={initialValue?.pagIbigNumber} />
        </FormField>
        <FormField label="TIN no.">
          <input name="tinNumber" required defaultValue={initialValue?.tinNumber} />
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
