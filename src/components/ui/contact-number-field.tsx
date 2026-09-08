"use client";

import { MaskedInputField } from "@/components/ui/masked-input-field";
import { formatContactNumber } from "@/lib/input-mask";

type ContactNumberFieldProps = Readonly<{
  name?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}>;

/**
 * The single reusable Contact Number field, backing Add Employee's original
 * implementation — same input mask (formatContactNumber), placeholder, and
 * pattern — so every feature that collects a PH mobile number behaves
 * identically instead of re-implementing the mask.
 */
export function ContactNumberField({
  name = "contactNumber",
  label = "Contact number",
  value,
  onChange,
  error,
  required,
  placeholder = "09XX-XXX-XXXX",
}: ContactNumberFieldProps) {
  return (
    <MaskedInputField
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      required={required}
      format={formatContactNumber}
      placeholder={placeholder}
      pattern="\d{4}-\d{3}-\d{4}"
      maxLength={13}
    />
  );
}
