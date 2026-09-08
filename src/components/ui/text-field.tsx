import type { ChangeEvent } from "react";
import { FormField } from "@/components/ui/form-field";

type TextFieldProps = Readonly<{
  name: string;
  label: string;
  type?: "text" | "password" | "time";
  value?: string;
  defaultValue?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  fullWidth?: boolean;
  standalone?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}>;

/**
 * The single reusable text input field — the FormField+input wrapper every
 * plain labeled text/password/time field in the app was hand-rolling. Works
 * either controlled (value+onChange) or uncontrolled (defaultValue).
 */
export function TextField({
  name,
  label,
  type = "text",
  value,
  defaultValue,
  onChange,
  error,
  required,
  minLength,
  maxLength,
  placeholder,
  fullWidth,
  standalone,
  autoComplete,
  autoFocus,
  disabled,
}: TextFieldProps) {
  const valueProps = value !== undefined ? { value, onChange } : { defaultValue };
  return (
    <FormField
      label={label}
      name={name}
      error={error}
      fullWidth={fullWidth}
      standalone={standalone}
      required={required}
    >
      <input
        type={type}
        name={name}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        data-testid={`field-${name}`}
        {...valueProps}
      />
    </FormField>
  );
}
