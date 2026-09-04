"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(event: {
    preventDefault(): void;
    currentTarget: HTMLFormElement;
  }) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      username: form.get("username"),
      password: form.get("password"),
      redirect: false,
    });
    if (result?.error)
      setError("Invalid credentials. Check your email and password.");
    else router.push("/");
  }
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand">
          <span className="brand-mark">W</span> Workforce{" "}
          <span className="brand-accent">Hub</span>
        </div>
        <div className="login-copy">
          <p className="eyebrow">Secure workspace</p>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to manage your workforce operations.</p>
        </div>
        <form onSubmit={submit} className="login-form">
          <label>
            Email or username{" "}
            <input
              name="username"
              type="text"
              autoComplete="username"
              required
              placeholder="Enter your email or username"
            />
          </label>
          <label>
            Password{" "}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Enter your password"
            />
          </label>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" type="submit">
            Sign in <ArrowRight size={16} />
          </button>
        </form>
        <div className="login-security">
          <ShieldCheck size={16} /> Access is protected by role-based
          permissions.
        </div>
      </section>
    </main>
  );
}
