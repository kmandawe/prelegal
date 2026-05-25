"use client";

import * as React from "react";
import {
  type Session,
  clearSession,
  getServerSession,
  getSession,
  saveSession,
  subscribeSession,
} from "@/lib/session";
import { Button } from "./ui/button";
import { Field } from "./ui/field";
import { Input } from "./ui/input";

/**
 * Fake login gate (PL-4): no real authentication. Collects a name and email,
 * records the visitor via the backend, then renders the platform. The session
 * is kept in localStorage so a reload stays signed in.
 */
export function AppGate({ children }: { children: React.ReactNode }) {
  const session = React.useSyncExternalStore(
    subscribeSession,
    getSession,
    getServerSession,
  );

  if (!session) return <LoginScreen />;

  return (
    <>
      <TopBar session={session} onSignOut={clearSession} />
      {children}
    </>
  );
}

function TopBar({
  session,
  onSignOut,
}: {
  session: Session;
  onSignOut: () => void;
}) {
  return (
    <div className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <span className="text-sm font-bold tracking-tight text-[#032147]">
          Prelegal
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#888888]">
            Signed in as {session.name || session.email}
          </span>
          <Button
            type="button"
            variant="outline"
            className="h-8"
            onClick={onSignOut}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoginScreen() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as Session;
      saveSession({ name: data.name, email: data.email });
    } catch {
      setError("Could not sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#032147]">
            Prelegal
          </h1>
          <p className="text-sm text-[#888888]">
            Sign in to draft legal agreements.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Name" htmlFor="login-name">
            <Input
              id="login-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoComplete="name"
              required
            />
          </Field>
          <Field label="Email" htmlFor="login-email">
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              autoComplete="email"
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
            {submitting ? "Signing in..." : "Continue"}
          </Button>
        </form>
      </div>
    </main>
  );
}
