"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ShieldCheck, LogIn } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";

export default function LoginPage() {
  const router = useRouter();
  const { validate, handleChange, fieldError } = useInlineFormValidation();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function submit(event: {
    preventDefault(): void;
    currentTarget: HTMLFormElement;
  }) {
    event.preventDefault();
    if (!validate(event.currentTarget)) return;
    setError("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      username: form.get("username"),
      password: form.get("password"),
      redirect: false,
    });
    if (result?.error) {
      setError("Invalid credentials. Check your email and password.");
      setIsSubmitting(false);
    } else router.push("/");
  }
  return (
    <main className="login-page">
      <div className="login-theme-toggle">
        <ThemeToggle />
      </div>
      <section className="login-card">
        <div className="brand">
          <Logo size={34} />
          <span className="brand-text">
            Workforce<span className="brand-accent">Hub</span>
          </span>
        </div>
        <div className="login-copy">
          <p className="eyebrow">Secure workspace</p>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to manage your workforce operations.</p>
        </div>
        <form
          onSubmit={submit}
          onChange={handleChange}
          className="login-form"
          noValidate
        >
          <FormField
            label="Email or username"
            name="username"
            error={fieldError("username")}
          >
            <input
              name="username"
              type="text"
              autoComplete="username"
              required
              placeholder="Enter your email or username"
            />
          </FormField>
          <FormField
            label="Password"
            name="password"
            error={fieldError("password")}
          >
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Enter your password"
            />
          </FormField>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            <LogIn size={14} /> Sign in
          </Button>
        </form>
        <div className="login-security">
          <ShieldCheck size={16} /> Access is protected by role-based
          permissions.
        </div>
      </section>
    </main>
  );
}
