import { FormField } from "@/components/ui/form-field";

type RemarksFieldProps = Readonly<{
  name?: string;
  label?: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
  maxLength?: number;
  fullWidth?: boolean;
  placeholder?: string;
}>;

/**
 * The single reusable Remarks field — same multi-line textbox style as Add
 * Employee's Address field (rows=4), for any feature collecting free-text
 * remarks instead of a single-line input.
 */
export function RemarksField({
  name = "remarks",
  label = "Remarks",
  defaultValue,
  error,
  required,
  maxLength = 500,
  fullWidth = true,
  placeholder,
}: RemarksFieldProps) {
  return (
    <FormField label={label} name={name} error={error} fullWidth={fullWidth} required={required}>
      <textarea
        name={name}
        rows={4}
        maxLength={maxLength}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        data-testid={`field-${name}`}
      />
    </FormField>
  );
}
