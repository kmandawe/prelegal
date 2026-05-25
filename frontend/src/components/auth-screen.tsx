"use client";

import * as React from "react";
import { ApiError, signin, signup, sessionFromAuth } from "@/lib/api";
import { LEGAL_DISCLAIMER_SHORT } from "@/lib/legal";
import { saveSession } from "@/lib/session";
import { Button } from "./ui/button";
import { Field } from "./ui/field";
import { Input } from "./ui/input";

type Mode = "signin" | "signup";

/**
 * Real authentication screen (PL-7): sign in or create an account. On success
 * the bearer token and profile are written to the session store, which unlocks
 * the app.
 */
export function AuthScreen() {
  const [mode, setMode] = React.useState<Mode>("signin");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isSignup = mode === "signup";

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = isSignup
        ? await signup(name.trim(), email.trim(), password)
        : await signin(email.trim(), password);
      saveSession(sessionFromAuth(result));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="rounded-lg bg-[#032147] px-3 py-1.5 text-lg font-bold tracking-tight text-white">
          Prelegal
        </span>
        <p className="max-w-sm text-sm text-[#888888]">
          Draft Common Paper legal agreements with an AI assistant.
        </p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1">
          <TabButton active={!isSignup} onClick={() => switchMode("signin")}>
            Sign in
          </TabButton>
          <TabButton active={isSignup} onClick={() => switchMode("signup")}>
            Create account
          </TabButton>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignup && (
            <Field label="Name" htmlFor="auth-name">
              <Input
                id="auth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
                required
              />
            </Field>
          )}
          <Field label="Email" htmlFor="auth-email">
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              autoComplete="email"
              required
            />
          </Field>
          <Field
            label="Password"
            htmlFor="auth-password"
            hint={isSignup ? "At least 8 characters." : undefined}
          >
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={isSignup ? 8 : undefined}
              required
            />
          </Field>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#753991] text-white shadow hover:bg-[#5f2d74]"
          >
            {submitting
              ? isSignup
                ? "Creating account..."
                : "Signing in..."
              : isSignup
                ? "Create account"
                : "Sign in"}
          </Button>
        </form>
      </div>

      <p className="mt-6 max-w-sm text-center text-xs text-[#888888]">
        {LEGAL_DISCLAIMER_SHORT}
      </p>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-[#032147] shadow-sm"
          : "rounded-md px-3 py-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-700"
      }
    >
      {children}
    </button>
  );
}
