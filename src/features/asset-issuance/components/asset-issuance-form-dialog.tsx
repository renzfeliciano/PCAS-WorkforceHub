"use client";

import { useState } from "react";
import { Package, Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { DateField } from "@/components/ui/date-field";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { RemarksField } from "@/components/ui/remarks-field";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
import { ApiRequestError } from "@/lib/api-client";
import { ASSET_CONDITIONS } from "@/schemas/asset-issuance";
import type { AssetIssuanceInput } from "@/schemas/asset-issuance";
import type { AssetIssuance } from "@/types/asset-issuance";

const CONDITION_OPTIONS: SelectOption[] = ASSET_CONDITIONS.map((condition) => ({
  value: condition,
  label: condition,
}));

type AssetIssuanceFormDialogProps = Readonly<{
  mode: "create" | "edit";
  employeeName: string;
  initialValue?: AssetIssuance;
  onClose: () => void;
  onSubmit: (input: AssetIssuanceInput) => Promise<void>;
}>;

export function AssetIssuanceFormDialog({
  mode,
  employeeName,
  initialValue,
  onClose,
  onSubmit,
}: AssetIssuanceFormDialogProps) {
  const { validate, handleChange, fieldError, applyServerErrors } = useInlineFormValidation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [issuedDate, setIssuedDate] = useState(initialValue?.issuedDate ?? "");
  const [returnedDate, setReturnedDate] = useState(initialValue?.returnedDate ?? "");

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (!validate(event.currentTarget)) return;
    const data = new FormData(event.currentTarget);
    const assetType = String(data.get("assetType") ?? "").trim();
    const serialNumber = String(data.get("serialNumber") ?? "").trim();
    const remarks = String(data.get("remarks") ?? "").trim();
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        assetName: String(data.get("assetName") ?? "").trim(),
        assetType: assetType || undefined,
        serialNumber: serialNumber || undefined,
        condition: String(data.get("condition")) as AssetIssuanceInput["condition"],
        issuedDate,
        returnedDate: returnedDate || undefined,
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
      eyebrow={mode === "create" ? "New asset issuance" : "Edit asset issuance"}
      title={employeeName}
      description="Track a company asset issued to this employee."
      onClose={onClose}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="cancel-asset-issuance-form"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={mode === "create" ? "Logging issuance" : "Saving changes"}
            data-testid="submit-asset-issuance-form"
          >
            {mode === "create" ? (
              <>
                <Package size={14} /> Log issuance
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
          name="assetName"
          label="Asset name"
          required
          maxLength={120}
          defaultValue={initialValue?.assetName}
          placeholder="e.g. Dell Latitude 5420"
          error={fieldError("assetName")}
        />
        <TextField
          name="assetType"
          label="Asset type"
          maxLength={60}
          defaultValue={initialValue?.assetType}
          placeholder="e.g. Laptop (optional)"
        />
        <TextField
          name="serialNumber"
          label="Serial number"
          maxLength={80}
          defaultValue={initialValue?.serialNumber}
          placeholder="Optional"
        />
        <SelectField
          name="condition"
          label="Condition"
          options={CONDITION_OPTIONS}
          required
          defaultValue={initialValue?.condition ?? ASSET_CONDITIONS[0]}
          error={fieldError("condition")}
        />
        <DateField
          name="issuedDate"
          label="Issued date"
          required
          value={issuedDate}
          onChange={(event) => setIssuedDate(event.target.value)}
          error={fieldError("issuedDate")}
        />
        <DateField
          name="returnedDate"
          label="Returned date"
          min={issuedDate || undefined}
          value={returnedDate}
          onChange={(event) => setReturnedDate(event.target.value)}
          error={fieldError("returnedDate")}
        />
        <RemarksField
          defaultValue={initialValue?.remarks}
          maxLength={255}
          placeholder="Optional"
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
