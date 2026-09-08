import { FormField } from "@/components/ui/form-field";

type EmailFieldProps = Readonly<{
  name?: string;
  label?: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}>;

/**
 * The single reusable Email field. Backed by the shared `emailSchema`
 * (@/schemas/shared) server-side, so validation, placeholder, and error
 * handling stay identical everywhere an email is collected.
 */
export function EmailField({
  name = "email",
  label = "Email",
  defaultValue,
  error,
  required,
  placeholder = "Optional",
  autoComplete,
}: EmailFieldProps) {
  return (
    <FormField label={label} name={name} error={error}>
      <input
        type="email"
        name={name}
        maxLength={150}
        required={required}
        defaultValue={defaultValue}
        placeholder={required ? undefined : placeholder}
        autoComplete={autoComplete}
        data-testid={`field-${name}`}
      />
    </FormField>
  );
}
