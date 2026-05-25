"use client";

import type { DocumentType, DocValues, Section } from "@/lib/document-types";
import { LEGAL_DISCLAIMER } from "@/lib/legal";

function value(values: DocValues, key: string, fallback: string): string {
  const v = values[key];
  return v && v.trim() ? v : `[${fallback}]`;
}

function PartyBlock({
  doc,
  values,
  section,
}: {
  doc: DocumentType;
  values: DocValues;
  section: Section;
}) {
  const fields = doc.fields.filter((f) => f.section === section.name);
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {section.name}
      </p>
      <p className="text-sm">
        <span className="text-zinc-500">Signature:</span>{" "}
        <span className="font-mono text-zinc-400">________________________</span>
      </p>
      {fields.map((f) => (
        <p key={f.key} className="whitespace-pre-line text-sm">
          <span className="text-zinc-500">{f.label}:</span>{" "}
          {value(values, f.key, f.label)}
        </p>
      ))}
      <p className="text-sm">
        <span className="text-zinc-500">Date:</span>{" "}
        <span className="font-mono text-zinc-400">________________</span>
      </p>
    </div>
  );
}

export function GenericPreview({
  doc,
  values,
}: {
  doc: DocumentType;
  values: DocValues;
}) {
  const partySections = doc.sections.filter((s) => s.is_party);
  const detailSections = doc.sections.filter((s) => !s.is_party);

  return (
    <article className="prose prose-zinc max-w-none rounded-lg border border-zinc-200 bg-white p-8 text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
      <h1 className="text-xl font-bold">{doc.short_name} — Cover Page</h1>

      <p className="rounded-md border border-[#ecad0a]/40 bg-[#ecad0a]/10 px-3 py-2 text-xs leading-5 text-[#7a5a00] not-prose">
        {LEGAL_DISCLAIMER}
      </p>

      <p className="text-sm leading-6">
        This {doc.short_name} consists of this Cover Page and the{" "}
        {doc.standard_terms_label}. The Cover Page captures the deal-specific
        details below and incorporates those Standard Terms by reference.
      </p>

      {detailSections.map((section) => {
        const fields = doc.fields.filter((f) => f.section === section.name);
        return (
          <section key={section.name}>
            <h2 className="mt-6 text-base font-semibold uppercase tracking-wide text-zinc-500">
              {section.name}
            </h2>
            {fields.map((f) => (
              <div key={f.key}>
                <h3 className="mt-4 text-sm font-semibold">{f.label}</h3>
                <p className="whitespace-pre-line text-sm">
                  {value(values, f.key, f.label)}
                </p>
              </div>
            ))}
          </section>
        );
      })}

      {partySections.length > 0 && (
        <>
          <p className="mt-6 text-sm">
            By signing this Cover Page, each party agrees to enter into this{" "}
            {doc.short_name}.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-md border border-zinc-200 p-4 sm:grid-cols-2 dark:border-zinc-800">
            {partySections.map((section) => (
              <PartyBlock
                key={section.name}
                doc={doc}
                values={values}
                section={section}
              />
            ))}
          </div>
        </>
      )}

      <hr className="my-8 border-zinc-200 dark:border-zinc-800" />

      <p className="text-sm">
        <span className="font-semibold">Standard Terms:</span> This Cover Page
        incorporates the {doc.standard_terms_label}, available at{" "}
        <a href={doc.standard_terms_url} className="underline">
          {doc.standard_terms_url}
        </a>
        .
      </p>
    </article>
  );
}
