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
  placeholder = "e.g. juandelacruz@gmail.com",
  autoComplete,
}: EmailFieldProps) {
  return (
    <FormField label={label} name={name} error={error} required={required}>
      <input
        type="email"
        name={name}
        maxLength={150}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        data-testid={`field-${name}`}
      />
    </FormField>
  );
}
