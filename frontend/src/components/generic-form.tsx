"use client";

import * as React from "react";
import type { DocField, DocumentType, DocValues } from "@/lib/document-types";
import { Field } from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export function GenericForm({
  doc,
  values,
  setValues,
}: {
  doc: DocumentType;
  values: DocValues;
  setValues: React.Dispatch<React.SetStateAction<DocValues>>;
}) {
  const update = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const renderField = (f: DocField) => (
    <Field key={f.key} label={f.label} htmlFor={f.key} hint={f.hint ?? undefined}>
      {f.type === "textarea" ? (
        <Textarea
          id={f.key}
          rows={2}
          placeholder={f.placeholder ?? undefined}
          value={values[f.key] ?? ""}
          onChange={(e) => update(f.key, e.target.value)}
        />
      ) : (
        <Input
          id={f.key}
          type={f.type === "date" ? "date" : "text"}
          autoComplete="off"
          placeholder={f.placeholder ?? undefined}
          value={values[f.key] ?? ""}
          onChange={(e) => update(f.key, e.target.value)}
        />
      )}
    </Field>
  );

  return (
    <div className="flex flex-col gap-6">
      {doc.sections.map((section) => {
        const fields = doc.fields.filter((f) => f.section === section.name);
        return (
          <fieldset
            key={section.name}
            className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {section.name}
            </legend>
            {fields.map(renderField)}
            {section.is_party && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Signature and date lines are added on the cover page.
              </p>
            )}
          </fieldset>
        );
      })}

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        The generated PDF is a Cover Page that incorporates the{" "}
        {doc.standard_terms_label}.
      </p>
    </div>
  );
}
