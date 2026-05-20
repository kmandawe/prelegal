"use client";

import { useFormContext } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import type { MndaFormValues } from "@/lib/schema";
import { Field } from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

type PartyKey = "party1" | "party2";

function PartyFields({ party, title }: { party: PartyKey; title: string }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<MndaFormValues>();
  const partyErrors = errors[party];

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </legend>
      <Field
        label="Print Name"
        htmlFor={`${party}.printName`}
        error={partyErrors?.printName?.message}
      >
        <Input
          id={`${party}.printName`}
          placeholder="Jane Doe"
          autoComplete="off"
          {...register(`${party}.printName`)}
        />
      </Field>
      <Field
        label="Title"
        htmlFor={`${party}.title`}
        error={partyErrors?.title?.message}
      >
        <Input
          id={`${party}.title`}
          placeholder="CEO"
          autoComplete="off"
          {...register(`${party}.title`)}
        />
      </Field>
      <Field
        label="Company"
        htmlFor={`${party}.company`}
        error={partyErrors?.company?.message}
      >
        <Input
          id={`${party}.company`}
          placeholder="Acme, Inc."
          autoComplete="organization"
          {...register(`${party}.company`)}
        />
      </Field>
      <Field
        label="Notice Address"
        htmlFor={`${party}.noticeAddress`}
        hint="Use either email or postal address."
        error={partyErrors?.noticeAddress?.message}
      >
        <Textarea
          id={`${party}.noticeAddress`}
          placeholder="legal@acme.com&#10;or&#10;123 Main St, Wilmington, DE 19801"
          rows={2}
          {...register(`${party}.noticeAddress`)}
        />
      </Field>
    </fieldset>
  );
}

type TermKindOption = {
  value: string;
  label: string;
  hasYearsInput?: boolean;
};

function TermFieldset({
  legend,
  description,
  kindField,
  yearsField,
  options,
  yearsError,
}: {
  legend: string;
  description: string;
  kindField: "mndaTermKind" | "termOfConfidentialityKind";
  yearsField: "mndaTermYears" | "termOfConfidentialityYears";
  options: [TermKindOption, TermKindOption];
  yearsError?: string;
}) {
  const { register, watch } = useFormContext<MndaFormValues>();
  const currentKind = watch(kindField);
  const yearsInput = (
    <Input
      type="number"
      min={1}
      max={50}
      disabled={currentKind !== "years"}
      className="w-20"
      {...register(yearsField as FieldPath<MndaFormValues>, {
        valueAsNumber: true,
      })}
    />
  );

  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {legend}
      </legend>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>

      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            value={option.value}
            className="h-4 w-4 accent-zinc-900 dark:accent-zinc-50"
            {...register(kindField)}
          />
          {option.hasYearsInput ? (
            <>
              {yearsInput}
              <span>{option.label}</span>
            </>
          ) : (
            <span>{option.label}</span>
          )}
        </label>
      ))}

      {yearsError && (
        <p className="ml-6 text-xs text-red-600 dark:text-red-400">
          {yearsError}
        </p>
      )}
    </fieldset>
  );
}

export function MndaForm() {
  const {
    register,
    formState: { errors },
  } = useFormContext<MndaFormValues>();

  return (
    <div className="flex flex-col gap-6">
      <Field
        label="Purpose"
        htmlFor="purpose"
        hint="How Confidential Information may be used."
        error={errors.purpose?.message}
      >
        <Textarea
          id="purpose"
          rows={2}
          placeholder="Evaluating whether to enter into a business relationship with the other party."
          {...register("purpose")}
        />
      </Field>

      <Field
        label="Effective Date"
        htmlFor="effectiveDate"
        error={errors.effectiveDate?.message}
      >
        <Input id="effectiveDate" type="date" {...register("effectiveDate")} />
      </Field>

      <TermFieldset
        legend="MNDA Term"
        description="The length of this MNDA."
        kindField="mndaTermKind"
        yearsField="mndaTermYears"
        yearsError={errors.mndaTermYears?.message}
        options={[
          {
            value: "years",
            label: "year(s) from Effective Date.",
            hasYearsInput: true,
          },
          {
            value: "untilTerminated",
            label:
              "Continues until terminated in accordance with the terms of the MNDA.",
          },
        ]}
      />

      <TermFieldset
        legend="Term of Confidentiality"
        description="How long Confidential Information is protected."
        kindField="termOfConfidentialityKind"
        yearsField="termOfConfidentialityYears"
        yearsError={errors.termOfConfidentialityYears?.message}
        options={[
          {
            value: "years",
            label: "year(s) from Effective Date (trade secrets per law).",
            hasYearsInput: true,
          },
          { value: "perpetuity", label: "In perpetuity." },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Governing Law (state)"
          htmlFor="governingLawState"
          hint="e.g. Delaware"
          error={errors.governingLawState?.message}
        >
          <Input
            id="governingLawState"
            placeholder="Delaware"
            {...register("governingLawState")}
          />
        </Field>
        <Field
          label="Jurisdiction"
          htmlFor="jurisdiction"
          hint='e.g. "New Castle, DE"'
          error={errors.jurisdiction?.message}
        >
          <Input
            id="jurisdiction"
            placeholder="New Castle, DE"
            {...register("jurisdiction")}
          />
        </Field>
      </div>

      <Field
        label="MNDA Modifications (optional)"
        htmlFor="modifications"
        hint="List any modifications to the Standard Terms."
      >
        <Textarea
          id="modifications"
          rows={2}
          placeholder="None"
          {...register("modifications")}
        />
      </Field>

      <PartyFields party="party1" title="Party 1" />
      <PartyFields party="party2" title="Party 2" />

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        The generated PDF includes the Cover Page and the Common Paper Standard
        Terms (v1.0).
      </p>
    </div>
  );
}
