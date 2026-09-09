import type { ChangeEvent } from "react";
import { FormField } from "@/components/ui/form-field";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectFieldProps = Readonly<{
  name: string;
  label: string;
  options: readonly SelectOption[];
  /** Rendered between the placeholder and `options` — e.g. a stale/inactive catalog value the current record still points at. */
  extraOptions?: readonly SelectOption[];
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Changing this remounts the underlying <select> — needed when a catalog loads asynchronously so an uncontrolled defaultValue applies once its matching <option> exists. */
  remountKey?: string | number;
}>;

/**
 * The single reusable select field — the FormField+select wrapper every
 * dropdown in the app (static option lists and catalog-driven ones alike)
 * was hand-rolling. Works either controlled (value+onChange) or
 * uncontrolled (defaultValue).
 */
export function SelectField({
  name,
  label,
  options,
  extraOptions,
  placeholder,
  value,
  defaultValue,
  onChange,
  error,
  required,
  disabled,
  fullWidth,
  remountKey,
}: SelectFieldProps) {
  const valueProps = value !== undefined ? { value, onChange } : { defaultValue };
  return (
    <FormField label={label} name={name} error={error} fullWidth={fullWidth} required={required}>
      <select
        key={remountKey}
        name={name}
        required={required}
        disabled={disabled}
        data-testid={`field-${name}`}
        {...valueProps}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {extraOptions?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
