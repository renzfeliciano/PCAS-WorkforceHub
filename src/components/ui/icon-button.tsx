import type { ButtonHTMLAttributes } from "react";

export function IconButton({
  className,
  title,
  "aria-label": ariaLabel,
  ...props
}: Readonly<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={["icon-button", className].filter(Boolean).join(" ")}
      title={title ?? ariaLabel}
      aria-label={ariaLabel}
      {...props}
    />
  );
}
