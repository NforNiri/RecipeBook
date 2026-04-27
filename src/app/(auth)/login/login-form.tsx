"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/db/client";

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    initialError ? "error" : "idle"
  );
  const [errorMessage, setErrorMessage] = useState(initialError ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const supabase = createBrowserClient();

      if (usePassword) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        window.location.href = "/";
        return;
      }

      const redirectTo = `${window.location.origin}/callback`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });

      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong."
      );
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--bg-canvas)" }}>
      <div
        className="w-full max-w-sm"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
          padding: "clamp(2rem, 5vw, 3rem)",
          boxShadow: "var(--shadow-lg-val)",
        }}
      >
        {/* Logo / wordmark */}
        <div className="mb-8 text-center">
          <h1
            style={{
              fontFamily: "var(--font-fraunces, Georgia, serif)",
              fontSize: "2.25rem",
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "var(--ink-primary)",
            }}
          >
            Cookbook
          </h1>
          <p
            className="mt-2"
            style={{
              fontFamily: "var(--font-source-serif, Georgia, serif)",
              fontSize: "1rem",
              color: "var(--ink-secondary)",
            }}
          >
            Your personal digital cookbook
          </p>
        </div>

        {status === "sent" ? (
          <div className="text-center">
            <div
              style={{
                fontSize: "2.5rem",
                marginBottom: "1rem",
              }}
            >
              ✉️
            </div>
            <h2
              style={{
                fontFamily: "var(--font-fraunces, Georgia, serif)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "var(--ink-primary)",
                marginBottom: "0.5rem",
              }}
            >
              Check your email
            </h2>
            <p
              style={{
                fontFamily: "var(--font-source-serif, Georgia, serif)",
                fontSize: "0.9375rem",
                color: "var(--ink-secondary)",
                lineHeight: 1.6,
              }}
            >
              We sent a sign-in link to{" "}
              <strong style={{ color: "var(--ink-primary)" }}>{email}</strong>.
              Click it and you&rsquo;re in.
            </p>
            <button
              onClick={() => setStatus("idle")}
              style={{
                marginTop: "1.5rem",
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "0.875rem",
                color: "var(--accent-primary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--ink-secondary)",
                marginBottom: "0.5rem",
              }}
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
              disabled={status === "loading"}
              style={{
                display: "block",
                width: "100%",
                padding: "0.625rem 0.875rem",
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "1rem",
                color: "var(--ink-primary)",
                backgroundColor: "var(--bg-muted)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                outline: "none",
                transition: "border-color var(--duration-fast)",
                marginBottom: "0.75rem",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--border-focus)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--border-default)")
              }
            />

            {/* Password toggle for dev bypass */}
            <button
              type="button"
              onClick={() => setUsePassword((v) => !v)}
              style={{
                display: "block",
                marginBottom: "0.75rem",
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "0.8125rem",
                color: "var(--ink-tertiary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              {usePassword ? "Use magic link instead" : "Sign in with password"}
            </button>

            {usePassword && (
              <>
                <label
                  htmlFor="password"
                  style={{
                    display: "block",
                    fontFamily: "var(--font-inter, sans-serif)",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "var(--ink-secondary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={status === "loading"}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    fontFamily: "var(--font-inter, sans-serif)",
                    fontSize: "1rem",
                    color: "var(--ink-primary)",
                    backgroundColor: "var(--bg-muted)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    outline: "none",
                    transition: "border-color var(--duration-fast)",
                    marginBottom: "1rem",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--border-focus)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "var(--border-default)")
                  }
                />
              </>
            )}

            {status === "error" && (
              <p
                style={{
                  fontFamily: "var(--font-inter, sans-serif)",
                  fontSize: "0.875rem",
                  color: "var(--status-danger)",
                  marginBottom: "1rem",
                }}
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !email.trim()}
              style={{
                display: "block",
                width: "100%",
                padding: "0.75rem 1rem",
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--ink-inverse)",
                backgroundColor:
                  status === "loading" || !email.trim()
                    ? "var(--ink-tertiary)"
                    : "var(--accent-primary)",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor:
                  status === "loading" || !email.trim()
                    ? "not-allowed"
                    : "pointer",
                transition: "background-color var(--duration-fast)",
              }}
            >
              {status === "loading"
                ? usePassword ? "Signing in…" : "Sending…"
                : usePassword ? "Sign in" : "Send sign-in link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
