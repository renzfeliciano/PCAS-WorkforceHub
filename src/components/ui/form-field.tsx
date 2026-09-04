import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

type FormFieldProps = Readonly<{
  label: string;
  name?: string;
  error?: string;
  children: ReactNode;
  standalone?: boolean;
  fullWidth?: boolean;
}>;

export function FormField({ label, name, error, children, standalone, fullWidth }: FormFieldProps) {
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
      {label}
      {child}
      {error && (
        <small id={errorId} className="inline-error" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
