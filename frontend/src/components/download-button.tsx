"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { pdf } from "@react-pdf/renderer";
import type { MndaFormValues } from "@/lib/schema";
import { MndaPdfDocument } from "./mnda-pdf";
import { Button } from "./ui/button";

function buildFilename(values: MndaFormValues): string {
  const slug = (s: string) =>
    s
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  const parties = [values.party1.company, values.party2.company]
    .map(slug)
    .filter(Boolean)
    .join("-and-");
  const stem = parties || "mutual-nda";
  return `${stem}-mnda.pdf`;
}

export function DownloadButton() {
  const { handleSubmit } = useFormContext<MndaFormValues>();
  const [busy, setBusy] = useState(false);

  const onValid = async (values: MndaFormValues) => {
    setBusy(true);
    try {
      const blob = await pdf(<MndaPdfDocument values={values} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildFilename(values);
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
      onClick={handleSubmit(onValid)}
      className="w-full sm:w-auto"
    >
      {busy ? "Generating PDF…" : "Download PDF"}
    </Button>
  );
}
