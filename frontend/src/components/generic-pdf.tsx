"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { DocumentType, DocValues } from "@/lib/document-types";
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
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 12 },
  intro: { marginBottom: 8 },
  sectionHeader: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#71717a",
    marginTop: 18,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  fieldLabel: { fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 2 },
  paragraph: { marginBottom: 4 },
  partyGrid: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    padding: 12,
    borderRadius: 4,
  },
  partyCol: { flex: 1 },
  partyLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#71717a",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  partyRow: { flexDirection: "row", marginBottom: 2 },
  partyKey: { color: "#71717a", width: 80 },
  partyValue: { flex: 1 },
  signatureLine: { color: "#a1a1aa", fontFamily: "Courier" },
  footer: { marginTop: 24, fontSize: 8, fontStyle: "italic", color: "#71717a" },
  disclaimer: { marginTop: 8, fontSize: 8, color: "#a16207" },
  link: { color: "#209dd7" },
});

function show(values: DocValues, key: string, fallback: string): string {
  const v = values[key];
  return v && v.trim() ? v : `[${fallback}]`;
}

export function GenericPdfDocument({
  doc,
  values,
}: {
  doc: DocumentType;
  values: DocValues;
}) {
  const partySections = doc.sections.filter((s) => s.is_party);
  const detailSections = doc.sections.filter((s) => !s.is_party);

  return (
    <Document title={`${doc.short_name} Cover Page`}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{doc.short_name} — Cover Page</Text>

        <Text style={styles.intro}>
          This {doc.short_name} consists of this Cover Page and the{" "}
          {doc.standard_terms_label}. The Cover Page captures the deal-specific
          details below and incorporates those Standard Terms by reference.
        </Text>

        {detailSections.map((section) => {
          const fields = doc.fields.filter((f) => f.section === section.name);
          return (
            <View key={section.name}>
              <Text style={styles.sectionHeader}>{section.name}</Text>
              {fields.map((f) => (
                <View key={f.key}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <Text style={styles.paragraph}>
                    {show(values, f.key, f.label)}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}

        {partySections.length > 0 && (
          <>
            <Text style={[styles.paragraph, { marginTop: 12 }]}>
              By signing this Cover Page, each party agrees to enter into this{" "}
              {doc.short_name}.
            </Text>
            <View style={styles.partyGrid}>
              {partySections.map((section) => {
                const fields = doc.fields.filter(
                  (f) => f.section === section.name,
                );
                return (
                  <View key={section.name} style={styles.partyCol}>
                    <Text style={styles.partyLabel}>{section.name}</Text>
                    <View style={styles.partyRow}>
                      <Text style={styles.partyKey}>Signature</Text>
                      <Text style={[styles.partyValue, styles.signatureLine]}>
                        ____________________
                      </Text>
                    </View>
                    {fields.map((f) => (
                      <View key={f.key} style={styles.partyRow}>
                        <Text style={styles.partyKey}>{f.label}</Text>
                        <Text style={styles.partyValue}>
                          {values[f.key]?.trim() ? values[f.key] : "—"}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.partyRow}>
                      <Text style={styles.partyKey}>Date</Text>
                      <Text style={[styles.partyValue, styles.signatureLine]}>
                        ____________________
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.footer}>
          Standard Terms: this Cover Page incorporates the{" "}
          {doc.standard_terms_label}, available at {doc.standard_terms_url}.
        </Text>
        <Text style={styles.disclaimer}>{LEGAL_DISCLAIMER}</Text>
      </Page>
    </Document>
  );
}
