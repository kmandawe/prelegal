import { z } from "zod";

const partySchema = z.object({
  printName: z.string().trim().min(1, "Required"),
  title: z.string().trim().min(1, "Required"),
  company: z.string().trim().min(1, "Required"),
  noticeAddress: z.string().trim().min(1, "Required"),
});

export const mndaSchema = z
  .object({
    purpose: z.string().trim().min(1, "Required"),
    effectiveDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Required"),
    mndaTermKind: z.enum(["years", "untilTerminated"]),
    mndaTermYears: z
      .number({ message: "Required" })
      .int()
      .min(1)
      .max(50)
      .optional()
      .or(z.nan().transform(() => undefined)),
    termOfConfidentialityKind: z.enum(["years", "perpetuity"]),
    termOfConfidentialityYears: z
      .number({ message: "Required" })
      .int()
      .min(1)
      .max(50)
      .optional()
      .or(z.nan().transform(() => undefined)),
    governingLawState: z.string().trim().min(1, "Required"),
    jurisdiction: z.string().trim().min(1, "Required"),
    modifications: z.string(),
    party1: partySchema,
    party2: partySchema,
  })
  .superRefine((value, ctx) => {
    if (value.mndaTermKind === "years" && value.mndaTermYears == null) {
      ctx.addIssue({
        code: "custom",
        path: ["mndaTermYears"],
        message: "Required",
      });
    }
    if (
      value.termOfConfidentialityKind === "years" &&
      value.termOfConfidentialityYears == null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["termOfConfidentialityYears"],
        message: "Required",
      });
    }
  });

export type MndaFormValues = z.infer<typeof mndaSchema>;
export type PartyValues = z.infer<typeof partySchema>;

export const defaultValues: MndaFormValues = {
  purpose:
    "Evaluating whether to enter into a business relationship with the other party.",
  effectiveDate: new Date().toISOString().slice(0, 10),
  mndaTermKind: "years",
  mndaTermYears: 1,
  termOfConfidentialityKind: "years",
  termOfConfidentialityYears: 1,
  governingLawState: "",
  jurisdiction: "",
  modifications: "",
  party1: { printName: "", title: "", company: "", noticeAddress: "" },
  party2: { printName: "", title: "", company: "", noticeAddress: "" },
};
