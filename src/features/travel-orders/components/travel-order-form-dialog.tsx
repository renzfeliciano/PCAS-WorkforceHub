"use client";

import { useState } from "react";
import { Plane, Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { DateField } from "@/components/ui/date-field";
import { RemarksField } from "@/components/ui/remarks-field";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
import { ApiRequestError } from "@/lib/api-client";
import { EmployeePicker } from "@/components/employee-picker";
import type { TravelOrderInput } from "@/schemas/travel-order";
import type { TravelOrder, TravelOrderEmployee } from "@/types/travel-order";

type TravelOrderFormDialogProps = Readonly<{
  mode: "create" | "edit";
  initialValue?: TravelOrder;
  onClose: () => void;
  onSubmit: (input: TravelOrderInput) => Promise<void>;
}>;

export function TravelOrderFormDialog({
  mode,
  initialValue,
  onClose,
  onSubmit,
}: TravelOrderFormDialogProps) {
  const { validate, handleChange, fieldError, applyServerErrors } = useInlineFormValidation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState<TravelOrderEmployee[]>(initialValue?.employees ?? []);
  const [startDate, setStartDate] = useState(initialValue?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialValue?.endDate ?? "");
  const [employeesError, setEmployeesError] = useState("");

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (!validate(event.currentTarget)) return;
    if (employees.length === 0) {
      setEmployeesError("Select at least one employee.");
      return;
    }
    setEmployeesError("");
    const data = new FormData(event.currentTarget);
    const remarks = String(data.get("remarks") ?? "").trim();
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        employeeIds: employees.map((employee) => employee.employeeId),
        startDate,
        endDate,
        remarks: remarks || undefined,
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
      eyebrow={mode === "create" ? "New travel order" : "Edit travel order"}
      title="Travel order"
      description="Dispatch one or more employees for a date range."
      onClose={onClose}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="cancel-travel-order-form"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={mode === "create" ? "Creating travel order" : "Saving changes"}
            data-testid="submit-travel-order-form"
          >
            {mode === "create" ? (
              <>
                <Plane size={14} /> Create travel order
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
      <FormField label="Employees" standalone error={employeesError}>
        <EmployeePicker selected={employees} onChange={setEmployees} />
      </FormField>
      <div className="form-grid">
        <DateField
          name="startDate"
          label="Start date"
          required
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          error={fieldError("startDate")}
        />
        <DateField
          name="endDate"
          label="End date"
          required
          min={startDate || undefined}
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          error={fieldError("endDate")}
        />
        <RemarksField
          defaultValue={initialValue?.remarks}
          maxLength={255}
          placeholder="e.g. Year-end audit — Cebu branch"
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
