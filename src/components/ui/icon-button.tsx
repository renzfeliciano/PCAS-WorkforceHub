import type { ButtonHTMLAttributes } from "react";

export function IconButton({
  className,
  ...props
}: Readonly<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return <button className={["icon-button", className].filter(Boolean).join(" ")} {...props} />;
}
