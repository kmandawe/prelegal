"use client";

import * as React from "react";
import {
  deleteDocument,
  listDocuments,
  type DocumentMeta,
} from "@/lib/api";
import type { DocumentType } from "@/lib/document-types";
import { Button } from "./ui/button";

function typeName(docs: DocumentType[] | null, id: string): string {
  return docs?.find((d) => d.id === id)?.short_name ?? id;
}

function formatDate(value: string): string {
  const date = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * "My Documents" view (PL-7): lists the documents the signed-in user has saved
 * and lets them reopen one (rehydrating the editor) or delete it.
 */
export function DocumentsHistory({
  docs,
  onOpen,
}: {
  docs: DocumentType[] | null;
  onOpen: (meta: DocumentMeta) => void;
}) {
  const [items, setItems] = React.useState<DocumentMeta[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    listDocuments()
      .then(setItems)
      .catch(() => setError("Could not load your documents."));
  }, []);

  async function remove(id: number) {
    try {
      await deleteDocument(id);
      setItems((prev) => prev?.filter((d) => d.id !== id) ?? null);
    } catch {
      setError("Could not delete that document. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#032147] dark:text-zinc-50">
          My Documents
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Reopen a saved document to keep editing it, or remove ones you no longer
          need.
        </p>
      </header>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {!items && !error && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Loading your documents...
        </p>
      )}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-sm font-medium text-[#032147] dark:text-zinc-100">
            No saved documents yet
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create a document and use Save to keep it here.
          </p>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-[#032147] dark:text-zinc-100">
                  {item.title}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {typeName(docs, item.doc_type)} · Updated {formatDate(item.updated_at)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => onOpen(item)}
                  className="h-8 bg-[#209dd7] text-white shadow hover:bg-[#1b87b9]"
                >
                  Open
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => void remove(item.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
