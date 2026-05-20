"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { defaultValues, type MndaFormValues, type PartyValues } from "@/lib/schema";
import {
  MNDA_STANDARD_TERMS,
  FOOTER_NOTE,
  deriveFields,
  fillStandardTermBody,
} from "@/lib/mnda-content";

function placeholder(value: string, fallback: string): string {
  return value.trim() ? value : `[${fallback}]`;
}

function PartyBlock({
  party,
  label,
}: {
  party: PartyValues;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="text-sm">
        <span className="text-zinc-500">Signature:</span>{" "}
        <span className="font-mono text-zinc-400">________________________</span>
      </p>
      <p className="text-sm">
        <span className="text-zinc-500">Print Name:</span>{" "}
        {placeholder(party.printName, "Name")}
      </p>
      <p className="text-sm">
        <span className="text-zinc-500">Title:</span>{" "}
        {placeholder(party.title, "Title")}
      </p>
      <p className="text-sm">
        <span className="text-zinc-500">Company:</span>{" "}
        {placeholder(party.company, "Company")}
      </p>
      <p className="text-sm whitespace-pre-line">
        <span className="text-zinc-500">Notice Address:</span>{" "}
        {placeholder(party.noticeAddress, "Email or postal address")}
      </p>
    </div>
  );
}

export function MndaPreview() {
  const { control } = useFormContext<MndaFormValues>();
  const watched = useWatch({ control });
  const values: MndaFormValues = {
    ...defaultValues,
    ...watched,
    party1: { ...defaultValues.party1, ...watched?.party1 },
    party2: { ...defaultValues.party2, ...watched?.party2 },
  };
  const derived = deriveFields(values);

  return (
    <article className="prose prose-zinc max-w-none rounded-lg border border-zinc-200 bg-white p-8 text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
      <h1 className="text-xl font-bold">Mutual Non-Disclosure Agreement</h1>

      <h2 className="mt-6 text-base font-semibold uppercase tracking-wide text-zinc-500">
        Using this Mutual Non-Disclosure Agreement
      </h2>
      <p className="text-sm leading-6">
        This Mutual Non-Disclosure Agreement (the &ldquo;MNDA&rdquo;) consists
        of: (1) this Cover Page (&ldquo;Cover Page&rdquo;) and (2) the Common
        Paper Mutual NDA Standard Terms Version 1.0 (&ldquo;Standard
        Terms&rdquo;). Any modifications of the Standard Terms should be made on
        the Cover Page, which will control over conflicts with the Standard
        Terms.
      </p>

      <h3 className="mt-6 text-sm font-semibold">Purpose</h3>
      <p className="text-sm">{derived.purpose}</p>

      <h3 className="mt-4 text-sm font-semibold">Effective Date</h3>
      <p className="text-sm">{derived.effectiveDateLabel}</p>

      <h3 className="mt-4 text-sm font-semibold">MNDA Term</h3>
      <p className="text-sm">{derived.mndaTermLabel}</p>

      <h3 className="mt-4 text-sm font-semibold">Term of Confidentiality</h3>
      <p className="text-sm">{derived.termOfConfidentialityLabel}</p>

      <h3 className="mt-4 text-sm font-semibold">
        Governing Law &amp; Jurisdiction
      </h3>
      <p className="text-sm">Governing Law: {derived.governingLaw}</p>
      <p className="text-sm">Jurisdiction: {derived.jurisdiction}</p>

      <h3 className="mt-4 text-sm font-semibold">MNDA Modifications</h3>
      <p className="text-sm whitespace-pre-line">{derived.modifications}</p>

      <p className="mt-6 text-sm">
        By signing this Cover Page, each party agrees to enter into this MNDA as
        of the Effective Date.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 rounded-md border border-zinc-200 p-4 sm:grid-cols-2 dark:border-zinc-800">
        <PartyBlock party={values.party1} label="Party 1" />
        <PartyBlock party={values.party2} label="Party 2" />
      </div>

      <hr className="my-8 border-zinc-200 dark:border-zinc-800" />

      <h2 className="text-base font-semibold uppercase tracking-wide text-zinc-500">
        Standard Terms
      </h2>
      <ol className="mt-2 list-decimal space-y-3 pl-5">
        {MNDA_STANDARD_TERMS.map((section) => (
          <li key={section.heading} className="text-sm leading-6">
            <span className="font-semibold">{section.heading}.</span>{" "}
            {fillStandardTermBody(section.body, derived)}
          </li>
        ))}
      </ol>

      <p className="mt-8 text-xs italic text-zinc-500">{FOOTER_NOTE}</p>
    </article>
  );
}
