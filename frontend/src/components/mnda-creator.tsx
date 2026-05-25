"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mndaSchema, defaultValues, type MndaFormValues } from "@/lib/schema";
import { MndaChat } from "./mnda-chat";
import { MndaForm } from "./mnda-form";
import { MndaPreview } from "./mnda-preview";
import { DownloadButton } from "./download-button";
import { SaveDocumentButton } from "./save-document-button";

function deriveTitle(values: MndaFormValues): string {
  const companies = [values.party1?.company, values.party2?.company]
    .filter((v): v is string => Boolean(v && v.trim()))
    .slice(0, 2);
  return companies.length
    ? `${companies.join(" & ")} - Mutual NDA`
    : "Untitled Mutual NDA";
}

export function MndaCreator({
  initialFields,
  savedId,
}: {
  initialFields?: Record<string, unknown>;
  savedId?: number;
}) {
  const methods = useForm<MndaFormValues>({
    resolver: zodResolver(mndaSchema),
    defaultValues: {
      ...defaultValues,
      ...(initialFields as Partial<MndaFormValues> | undefined),
    },
    mode: "onChange",
  });

  return (
    <FormProvider {...methods}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section aria-label="Form" className="flex flex-col gap-6">
          <MndaChat />
          <details className="rounded-lg border border-zinc-200 dark:border-zinc-800" open>
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#032147] dark:text-zinc-100">
              Review &amp; edit fields
            </summary>
            <div className="px-4 pb-4">
              <MndaForm />
            </div>
          </details>
          <div className="sticky bottom-0 -mx-2 flex flex-wrap items-start gap-3 border-t border-zinc-200 bg-white/90 px-2 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
            <DownloadButton />
            <SaveDocumentButton
              documentType="mnda"
              initialSavedId={savedId}
              buildPayload={() => {
                const values = methods.getValues();
                return { title: deriveTitle(values), fields: values };
              }}
            />
          </div>
        </section>

        <section
          aria-label="Preview"
          className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto"
        >
          <MndaPreview />
        </section>
      </div>
    </FormProvider>
  );
}
