"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Lock, LogIn, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
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
  const [showPassword, setShowPassword] = useState(false);
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
      setError("Invalid credentials. Check your email or username and password.");
      setIsSubmitting(false);
    } else router.push("/");
  }
  return (
    <main className="login-page">
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
            <p className="eyebrow">Workforce management platform</p>
            <h1>Welcome back</h1>
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
            <label>
              <span className="field-label">Email or username</span>
              <div className="login-input-group">
                <Mail size={16} className="login-input-icon" aria-hidden="true" />
                <input
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="Enter your email or username"
                  aria-invalid={fieldError("username") ? true : undefined}
                  aria-describedby={fieldError("username") ? "username-field-error" : undefined}
                />
              </div>
              {fieldError("username") && (
                <small id="username-field-error" className="inline-error" role="alert">
                  {fieldError("username")}
                </small>
              )}
            </label>
            <label>
              <span className="field-label">Password</span>
              <div className="login-input-group">
                <Lock size={16} className="login-input-icon" aria-hidden="true" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  aria-invalid={fieldError("password") ? true : undefined}
                  aria-describedby={fieldError("password") ? "password-field-error" : undefined}
                />
                <button
                  type="button"
                  className="login-input-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldError("password") && (
                <small id="password-field-error" className="inline-error" role="alert">
                  {fieldError("password")}
                </small>
              )}
            </label>
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
        <footer className="app-footer login-footer">
          &copy; {new Date().getFullYear()} PCAS WorkforceHub. All rights reserved.
        </footer>
      </div>
      <LoginBackgroundCarousel />
    </main>
  );
}
