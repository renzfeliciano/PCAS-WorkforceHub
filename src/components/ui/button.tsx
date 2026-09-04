import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "@/components/ui/spinner";

type ButtonVariant = "primary" | "secondary" | "danger" | "warning";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  isLoading?: boolean;
};

export function Button({
  variant = "secondary",
  isLoading,
  disabled,
  className,
  children,
  ...props
}: Readonly<ButtonProps>) {
  return (
    <button
      className={["button", variant, className].filter(Boolean).join(" ")}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Spinner /> : children}
    </button>
  );
}
