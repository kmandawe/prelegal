"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { MndaFormValues } from "@/lib/schema";
import {
  MNDA_STANDARD_TERMS,
  FOOTER_NOTE,
  deriveFields,
  fillStandardTermBody,
} from "@/lib/mnda-content";
import { LEGAL_DISCLAIMER } from "@/lib/legal";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 56,
    paddingHorizontal: 56,
    fontSize: 10,
    lineHeight: 1.5,
    color: "#18181b",
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#71717a",
    marginTop: 18,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 2,
  },
  paragraph: {
    marginBottom: 4,
  },
  intro: {
    marginBottom: 8,
  },
  partyGrid: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    padding: 12,
    borderRadius: 4,
  },
  partyCol: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#71717a",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  partyRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  partyKey: {
    color: "#71717a",
    width: 70,
  },
  partyValue: {
    flex: 1,
  },
  signatureLine: {
    color: "#a1a1aa",
    fontFamily: "Courier",
  },
  standardTermsHeader: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 24,
    marginBottom: 8,
  },
  termItem: {
    flexDirection: "row",
    marginBottom: 6,
  },
  termNumber: {
    width: 18,
    fontFamily: "Helvetica-Bold",
  },
  termBody: {
    flex: 1,
  },
  termHeading: {
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    marginTop: 24,
    fontSize: 8,
    fontStyle: "italic",
    color: "#71717a",
  },
  disclaimer: {
    marginTop: 8,
    fontSize: 8,
    color: "#a16207",
  },
});

function PartyColumn({
  label,
  party,
}: {
  label: string;
  party: MndaFormValues["party1"];
}) {
  const row = (k: string, v: string) => (
    <View style={styles.partyRow}>
      <Text style={styles.partyKey}>{k}</Text>
      <Text style={styles.partyValue}>{v || "—"}</Text>
    </View>
  );
  return (
    <View style={styles.partyCol}>
      <Text style={styles.partyLabel}>{label}</Text>
      <View style={styles.partyRow}>
        <Text style={styles.partyKey}>Signature</Text>
        <Text style={[styles.partyValue, styles.signatureLine]}>
          ________________________
        </Text>
      </View>
      {row("Print Name", party.printName)}
      {row("Title", party.title)}
      {row("Company", party.company)}
      {row("Notice", party.noticeAddress)}
    </View>
  );
}

export function MndaPdfDocument({ values }: { values: MndaFormValues }) {
  const derived = deriveFields(values);

  return (
    <Document title="Mutual Non-Disclosure Agreement">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Mutual Non-Disclosure Agreement</Text>

        <Text style={styles.sectionHeader}>
          Using this Mutual Non-Disclosure Agreement
        </Text>
        <Text style={styles.intro}>
          This Mutual Non-Disclosure Agreement (the “MNDA”) consists
          of: (1) this Cover Page (“Cover Page”) and (2) the Common
          Paper Mutual NDA Standard Terms Version 1.0 (“Standard
          Terms”). Any modifications of the Standard Terms should be made
          on the Cover Page, which will control over conflicts with the
          Standard Terms.
        </Text>

        <Text style={styles.fieldLabel}>Purpose</Text>
        <Text style={styles.paragraph}>{derived.purpose}</Text>

        <Text style={styles.fieldLabel}>Effective Date</Text>
        <Text style={styles.paragraph}>{derived.effectiveDateLabel}</Text>

        <Text style={styles.fieldLabel}>MNDA Term</Text>
        <Text style={styles.paragraph}>{derived.mndaTermLabel}</Text>

        <Text style={styles.fieldLabel}>Term of Confidentiality</Text>
        <Text style={styles.paragraph}>{derived.termOfConfidentialityLabel}</Text>

        <Text style={styles.fieldLabel}>Governing Law & Jurisdiction</Text>
        <Text style={styles.paragraph}>
          Governing Law: {derived.governingLaw}
        </Text>
        <Text style={styles.paragraph}>
          Jurisdiction: {derived.jurisdiction}
        </Text>

        <Text style={styles.fieldLabel}>MNDA Modifications</Text>
        <Text style={styles.paragraph}>{derived.modifications}</Text>

        <Text style={[styles.paragraph, { marginTop: 12 }]}>
          By signing this Cover Page, each party agrees to enter into this MNDA
          as of the Effective Date.
        </Text>

        <View style={styles.partyGrid}>
          <PartyColumn label="Party 1" party={values.party1} />
          <PartyColumn label="Party 2" party={values.party2} />
        </View>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Text style={styles.standardTermsHeader}>Standard Terms</Text>
        {MNDA_STANDARD_TERMS.map((section, idx) => (
          <View key={section.heading} style={styles.termItem}>
            <Text style={styles.termNumber}>{idx + 1}.</Text>
            <Text style={styles.termBody}>
              <Text style={styles.termHeading}>{section.heading}.</Text>{" "}
              {fillStandardTermBody(section.body, derived)}
            </Text>
          </View>
        ))}
        <Text style={styles.footer}>{FOOTER_NOTE}</Text>
        <Text style={styles.disclaimer}>{LEGAL_DISCLAIMER}</Text>
      </Page>
    </Document>
  );
}
