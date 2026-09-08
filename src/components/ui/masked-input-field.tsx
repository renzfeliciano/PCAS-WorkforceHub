"use client";

import { FormField } from "@/components/ui/form-field";

type MaskedInputFieldProps = Readonly<{
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  format: (raw: string) => string;
  placeholder: string;
  pattern: string;
  maxLength: number;
  title?: string;
  error?: string;
  required?: boolean;
}>;

/**
 * The single reusable masked-number field — label, controlled value, a
 * caller-supplied format function, and matching placeholder/title/pattern,
 * backing every PH-format ID/number field (contact number, SSS, PhilHealth,
 * Pag-IBIG, TIN) so they share one implementation instead of each
 * hand-rolling the same input-mask wiring.
 */
export function MaskedInputField({
  name,
  label,
  value,
  onChange,
  format,
  placeholder,
  pattern,
  maxLength,
  title,
  error,
  required,
}: MaskedInputFieldProps) {
  return (
    <FormField label={label} name={name} error={error} required={required}>
      <input
        name={name}
        inputMode="numeric"
        placeholder={placeholder}
        title={title ?? `Format: ${placeholder}`}
        pattern={pattern}
        maxLength={maxLength}
        required={required}
        value={value}
        onChange={(event) => onChange(format(event.target.value))}
        data-testid={`field-${name}`}
      />
    </FormField>
  );
}
