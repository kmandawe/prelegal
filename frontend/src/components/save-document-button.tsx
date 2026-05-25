"use client";

import * as React from "react";
import { ApiError, saveDocument } from "@/lib/api";
import { Button } from "./ui/button";

type Payload = { title: string; fields: Record<string, unknown> };

/**
 * "Save to my documents" button (PL-7). Shared by both creators. The first save
 * inserts a new document; later saves update the same record, so the user never
 * ends up with duplicates while editing.
 */
export function SaveDocumentButton({
  documentType,
  buildPayload,
  initialSavedId,
}: {
  documentType: string;
  buildPayload: () => Payload;
  initialSavedId?: number;
}) {
  const [savedId, setSavedId] = React.useState<number | undefined>(initialSavedId);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const { title, fields } = buildPayload();
      const saved = await saveDocument({ documentType, title, fields, id: savedId });
      setSavedId(saved.id);
      setStatus("Saved to My Documents");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => void onClick()}
        className="w-full sm:w-auto"
      >
        {busy ? "Saving..." : savedId ? "Update saved document" : "Save to My Documents"}
      </Button>
      {status && <span className="text-xs text-[#209dd7]">{status}</span>}
      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
