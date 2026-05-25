/**
 * Document-type registry shared with the backend (PL-6). The shapes mirror the
 * Pydantic models in backend/app/document_types.py; the data is fetched at
 * runtime from GET /api/document-types so the backend stays the single source
 * of truth.
 */

export type FieldType = "text" | "textarea" | "date";

export type DocField = {
  key: string;
  label: string;
  section: string;
  type: FieldType;
  hint: string | null;
  placeholder: string | null;
};

export type Section = {
  name: string;
  is_party: boolean;
};

export type DocEngine = "mnda" | "generic";

export type DocumentType = {
  id: string;
  name: string;
  short_name: string;
  description: string;
  engine: DocEngine;
  standard_terms_label: string;
  standard_terms_url: string;
  sections: Section[];
  fields: DocField[];
};

export type ChatRole = "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

export type ExtractedField = { key: string; value: string | null };
export type AssistantResponse = {
  reply: string;
  documentType: string | null;
  fields: ExtractedField[];
};

export type DocValues = Record<string, string>;

export async function fetchDocumentTypes(): Promise<DocumentType[]> {
  const res = await fetch("/api/document-types");
  if (!res.ok) throw new Error("Failed to load document types");
  return (await res.json()) as DocumentType[];
}

/** Applies extracted values onto current state; null/undefined never clears. */
export function mergeFields(prev: DocValues, fields: ExtractedField[]): DocValues {
  const next = { ...prev };
  for (const f of fields) {
    if (f.value !== null && f.value !== undefined) next[f.key] = f.value;
  }
  return next;
}
