import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "@/components/ui/spinner";

type ButtonVariant = "primary" | "secondary" | "danger" | "warning";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  isLoading?: boolean;
  /** Present-participle label shown next to the spinner while loading, e.g. "Saving changes" for a "Save changes" button. */
  loadingText?: string;
};

export function Button({
  variant = "secondary",
  isLoading,
  loadingText,
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
      {isLoading ? (
        <>
          <Spinner size={14} />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
