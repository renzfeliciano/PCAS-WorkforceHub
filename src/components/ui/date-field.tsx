import type { ChangeEvent } from "react";
import { FormField } from "@/components/ui/form-field";

type DateFieldProps = Readonly<{
  name: string;
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  fullWidth?: boolean;
}>;

/**
 * The single reusable date field — the FormField+input[type=date] wrapper
 * every date picker in the app was hand-rolling. Works either controlled
 * (value+onChange, for date-range pairs that need a live `min`/`max`) or
 * uncontrolled (defaultValue).
 */
export function DateField({
  name,
  label,
  value,
  defaultValue,
  onChange,
  error,
  required,
  min,
  max,
  placeholder,
  fullWidth,
}: DateFieldProps) {
  const valueProps = value !== undefined ? { value, onChange } : { defaultValue };
  return (
    <FormField label={label} name={name} error={error} fullWidth={fullWidth} required={required}>
      <input
        type="date"
        name={name}
        required={required}
        min={min}
        max={max}
        placeholder={placeholder}
        data-testid={`field-${name}`}
        {...valueProps}
      />
    </FormField>
  );
}
