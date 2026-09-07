"use client";

import { useState } from "react";
import { Package, Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";
import { ApiRequestError } from "@/lib/api-client";
import { ASSET_CONDITIONS } from "@/schemas/asset-issuance";
import type { AssetIssuanceInput } from "@/schemas/asset-issuance";
import type { AssetIssuance } from "@/types/asset-issuance";

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
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={mode === "create" ? "Logging issuance" : "Saving changes"}
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
        <FormField label="Asset name" name="assetName" error={fieldError("assetName")}>
          <input
            name="assetName"
            required
            maxLength={120}
            defaultValue={initialValue?.assetName}
            placeholder="e.g. Dell Latitude 5420"
          />
        </FormField>
        <FormField label="Asset type" name="assetType">
          <input
            name="assetType"
            maxLength={60}
            defaultValue={initialValue?.assetType}
            placeholder="e.g. Laptop (optional)"
          />
        </FormField>
        <FormField label="Serial number" name="serialNumber">
          <input
            name="serialNumber"
            maxLength={80}
            defaultValue={initialValue?.serialNumber}
            placeholder="Optional"
          />
        </FormField>
        <FormField label="Condition" name="condition" error={fieldError("condition")}>
          <select name="condition" required defaultValue={initialValue?.condition ?? ASSET_CONDITIONS[0]}>
            {ASSET_CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Issued date" name="issuedDate" error={fieldError("issuedDate")}>
          <input
            type="date"
            name="issuedDate"
            required
            value={issuedDate}
            onChange={(event) => setIssuedDate(event.target.value)}
          />
        </FormField>
        <FormField label="Returned date" name="returnedDate" error={fieldError("returnedDate")}>
          <input
            type="date"
            name="returnedDate"
            min={issuedDate || undefined}
            value={returnedDate}
            onChange={(event) => setReturnedDate(event.target.value)}
          />
        </FormField>
        <FormField label="Remarks" name="remarks" fullWidth>
          <input
            name="remarks"
            maxLength={255}
            defaultValue={initialValue?.remarks}
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
