"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ShieldCheck, LogIn, ShieldAlert } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LoginBackgroundCarousel } from "@/components/login-background-carousel";
import { useInlineFormValidation } from "@/hooks/use-inline-form-validation";

const SIGN_OUT_REASON_COPY: Record<string, string> = {
  "concurrent-session":
    "You were signed out because your account was used to sign in on another device or browser.",
  "idle-timeout": "You were signed out after a period of inactivity.",
};

/** Reads the ?reason= query param — isolated so only this sliver needs a Suspense boundary. */
function SignOutReasonNotice() {
  const reason = useSearchParams().get("reason");
  const message = reason ? SIGN_OUT_REASON_COPY[reason] : undefined;
  if (!message) return null;
  return (
    <div className="notice" role="status">
      <ShieldAlert size={15} />
      <span>{message}</span>
    </div>
  );
}

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
      <LoginBackgroundCarousel />
      <div className="login-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="login-form-panel">
        <section className="login-card">
          <div className="brand">
            <Logo size={50} />
            <span className="brand-text mt-1">
              Workforce<span className="brand-accent">Hub</span>
            </span>
          </div>
          <div className="login-copy">
            <p className="muted">
              Sign in to manage your workforce operations.
            </p>
          </div>
          <Suspense fallback={null}>
            <SignOutReasonNotice />
          </Suspense>
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
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              loadingText="Signing in"
            >
              <LogIn size={14} /> Sign in
            </Button>
          </form>
          <div className="login-security">
            <ShieldCheck size={16} /> Access is protected by role-based
            permissions.
          </div>
        </section>
      </div>
      <footer className="app-footer login-footer">
        PCAS WorkforceHub <span>·</span> Established 2026
      </footer>
    </main>
  );
}
