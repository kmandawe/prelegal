"use client";

import * as React from "react";
import type { ChatMessage, DocumentType, DocValues } from "@/lib/document-types";
import { GenericChat } from "./generic-chat";
import { GenericForm } from "./generic-form";
import { GenericPreview } from "./generic-preview";
import { GenericDownloadButton } from "./generic-download-button";
import { SaveDocumentButton } from "./save-document-button";

function deriveTitle(doc: DocumentType, values: DocValues): string {
  const companies = doc.fields
    .filter((f) => f.key.endsWith("Company"))
    .map((f) => values[f.key])
    .filter((v): v is string => Boolean(v && v.trim()))
    .slice(0, 2);
  return companies.length
    ? `${companies.join(" & ")} - ${doc.short_name}`
    : `Untitled ${doc.short_name}`;
}

export function DocumentCreator({
  doc,
  initialFields,
  savedId,
}: {
  doc: DocumentType;
  initialFields?: Record<string, unknown>;
  savedId?: number;
}) {
  const [values, setValues] = React.useState<DocValues>(
    () => (initialFields as DocValues) ?? {},
  );
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        `Great — let's put together your ${doc.short_name}. Tell me about the ` +
        "deal and the parties involved, and I'll fill in the cover page as we go.",
    },
  ]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <section aria-label="Form" className="flex flex-col gap-6">
        <GenericChat
          doc={doc}
          values={values}
          setValues={setValues}
          messages={messages}
          setMessages={setMessages}
        />
        <details
          className="rounded-lg border border-zinc-200 dark:border-zinc-800"
          open
        >
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#032147] dark:text-zinc-100">
            Review &amp; edit fields
          </summary>
          <div className="px-4 pb-4">
            <GenericForm doc={doc} values={values} setValues={setValues} />
          </div>
        </details>
        <div className="sticky bottom-0 -mx-2 flex flex-wrap items-start gap-3 border-t border-zinc-200 bg-white/90 px-2 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
          <GenericDownloadButton doc={doc} values={values} />
          <SaveDocumentButton
            documentType={doc.id}
            initialSavedId={savedId}
            buildPayload={() => ({ title: deriveTitle(doc, values), fields: values })}
          />
        </div>
      </section>

      <section
        aria-label="Preview"
        className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto"
      >
        <GenericPreview doc={doc} values={values} />
      </section>
    </div>
  );
}
