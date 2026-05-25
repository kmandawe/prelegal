"use client";

/**
 * Typed client for the Prelegal API (PL-7). authedFetch injects the bearer
 * token and, on a 401, clears the local session so the app falls back to the
 * sign-in screen.
 */

import { clearSession, getSession, type Session } from "./session";

export type AuthResult = { token: string; user: { name: string; email: string } };

export type DocumentMeta = {
  id: number;
  doc_type: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type DocumentDetail = DocumentMeta & { fields: Record<string, unknown> };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: string };
    return data.detail ?? fallback;
  } catch {
    return fallback;
  }
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = getSession();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    clearSession();
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }
  return res;
}

export async function signup(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) throw new ApiError(res.status, await readError(res, "Could not create your account."));
  return (await res.json()) as AuthResult;
}

export async function signin(email: string, password: string): Promise<AuthResult> {
  const res = await fetch("/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new ApiError(res.status, await readError(res, "Could not sign in."));
  return (await res.json()) as AuthResult;
}

export async function signout(): Promise<void> {
  const session = getSession();
  if (!session) return;
  await fetch("/api/auth/signout", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` },
  }).catch(() => {});
}

export async function fetchMe(): Promise<{ name: string; email: string } | null> {
  try {
    const res = await authedFetch("/api/auth/me");
    if (!res.ok) return null;
    return (await res.json()) as { name: string; email: string };
  } catch {
    return null;
  }
}

export type SaveDocumentPayload = {
  documentType: string;
  title: string;
  fields: Record<string, unknown>;
  id?: number;
};

export async function saveDocument(payload: SaveDocumentPayload): Promise<DocumentDetail> {
  const res = await authedFetch("/api/documents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new ApiError(res.status, await readError(res, "Could not save the document."));
  return (await res.json()) as DocumentDetail;
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  const res = await authedFetch("/api/documents");
  if (!res.ok) throw new ApiError(res.status, await readError(res, "Could not load your documents."));
  return (await res.json()) as DocumentMeta[];
}

export async function getDocument(id: number): Promise<DocumentDetail> {
  const res = await authedFetch(`/api/documents/${id}`);
  if (!res.ok) throw new ApiError(res.status, await readError(res, "Could not open the document."));
  return (await res.json()) as DocumentDetail;
}

export async function deleteDocument(id: number): Promise<void> {
  const res = await authedFetch(`/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new ApiError(res.status, await readError(res, "Could not delete the document."));
}

export function sessionFromAuth(result: AuthResult): Session {
  return { token: result.token, name: result.user.name, email: result.user.email };
}
