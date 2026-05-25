"use client";

/**
 * localStorage-backed session store (PL-7). Holds the bearer token and the
 * signed-in user's profile. Exposed as an external store so components can read
 * it via useSyncExternalStore without hydration mismatches.
 */

export type Session = { token: string; name: string; email: string };

const SESSION_KEY = "prelegal_session";
const listeners = new Set<() => void>();

// Cache keeps a stable reference while the raw value is unchanged, which
// useSyncExternalStore requires to avoid re-render loops.
let cachedRaw: string | null = null;
let cached: Session | null = null;

function parse(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Session;
    return value.token ? value : null;
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

export function getServerSession(): Session | null {
  return null;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function saveSession(session: Session): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emit();
}

export function clearSession(): void {
  window.localStorage.removeItem(SESSION_KEY);
  emit();
}

function emit(): void {
  for (const listener of listeners) listener();
}
