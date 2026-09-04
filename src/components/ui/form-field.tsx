import type { ReactNode } from "react";

type FormFieldProps = Readonly<{
  label: string;
  error?: string;
  children: ReactNode;
  standalone?: boolean;
}>;

export function FormField({ label, error, children, standalone }: FormFieldProps) {
  return (
    <label className={standalone ? "modal-field" : undefined}>
      {label}
      {children}
      {error && <small className="inline-error">{error}</small>}
    </label>
  );
}
