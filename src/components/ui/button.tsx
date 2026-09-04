import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "secondary", className, ...props }: Readonly<ButtonProps>) {
  return (
    <button
      className={["button", variant, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
