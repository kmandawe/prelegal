"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { DocumentType, DocValues } from "@/lib/document-types";
import { GenericPdfDocument } from "./generic-pdf";
import { Button } from "./ui/button";

function slug(s: string): string {
  return s
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function buildFilename(doc: DocumentType, values: DocValues): string {
  const companies = doc.fields
    .filter((f) => f.key.endsWith("Company"))
    .map((f) => values[f.key])
    .filter((v): v is string => Boolean(v && v.trim()))
    .slice(0, 2)
    .map(slug);
  const stem = companies.length ? companies.join("-and-") : doc.id;
  return `${stem}-${doc.id}.pdf`;
}

export function GenericDownloadButton({
  doc,
  values,
}: {
  doc: DocumentType;
  values: DocValues;
}) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      const blob = await pdf(
        <GenericPdfDocument doc={doc} values={values} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildFilename(doc, values);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      disabled={busy}
      onClick={() => void onClick()}
      className="w-full sm:w-auto"
    >
      {busy ? "Generating PDF…" : "Download PDF"}
    </Button>
  );
}
