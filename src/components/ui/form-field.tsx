import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

type FormFieldProps = Readonly<{
  label: string;
  name?: string;
  error?: string;
  children: ReactNode;
  standalone?: boolean;
  fullWidth?: boolean;
  /** Renders a red asterisk after the label — the input's own `required` attribute still carries the actual constraint (and its screen-reader announcement); this is a purely visual cue for sighted users, paired with the "Fields marked with * are required" hint in Modal. */
  required?: boolean;
}>;

export function FormField({
  label,
  name,
  error,
  children,
  standalone,
  fullWidth,
  required,
}: FormFieldProps) {
  const errorId = name ? `${name}-error` : undefined;
  const child =
    name && isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          "aria-invalid": error ? true : undefined,
          "aria-describedby": error ? errorId : undefined,
        })
      : children;

  return (
    <label
      className={standalone ? "modal-field" : undefined}
      style={fullWidth ? { gridColumn: "1 / -1" } : undefined}
    >
      <span className="field-label">
        {label}
        {required && (
          <span className="required-asterisk" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </span>
      {child}
      {error && (
        <small id={errorId} className="inline-error" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
