import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { WorkstyleReport } from "@/lib/assessments/workstyle";
import type { Attempt } from "@/server/services/assessments";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#333333" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#D5DBE3" },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#011842" },
  tagline: { fontSize: 9, color: "#6B7280" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#011842", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#6B7280", marginBottom: 16 },
  hero: { backgroundColor: "#011842", padding: 16, borderRadius: 8, marginBottom: 16 },
  heroLabel: { color: "#EEF2F6", fontSize: 9 },
  heroLevel: { color: "#02AA86", fontSize: 32, fontFamily: "Helvetica-Bold" },
  section: { marginBottom: 14 },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#011842", marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#EEF2F6" },
  muted: { color: "#6B7280" },
  bullet: { marginBottom: 3 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#6B7280", borderTopWidth: 0.5, borderTopColor: "#D5DBE3", paddingTop: 6 },
});

type Labels = {
  title: string;
  candidate: string;
  date: string;
  level: string;
  mcq: string;
  writing: string;
  feedback: string;
  factors: string;
  sjt: string;
  strengths: string;
  disclaimer: string;
  verified: string;
};

type WrittenReport = { mcq: { correct: number; total: number; level: string }; writing: { total: number; level: string; feedback: string[] } | null };

export function AssessmentReportPdf({ attempt, type, candidateName, locale, labels }: { attempt: Attempt; type: string; candidateName: string; locale: "en" | "es"; labels: Labels }) {
  const dateText = attempt.validated_at ? new Date(attempt.validated_at).toLocaleDateString(locale === "es" ? "es-CO" : "en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
  const written = type === "english_written" ? (attempt.report as WrittenReport | null) : null;
  const workstyle = type === "psychometric" ? (attempt.report as WorkstyleReport | null) : null;
  const oral = type === "english_oral" ? (attempt.ai_result as { feedback?: string[] } | null) : null;
  return (
    <Document title={`${labels.title} - ${candidateName}`} author="Dexee S.A.S.">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Dexee</Text>
            <Text style={styles.tagline}>Nearshore talent & back-office partner for U.S. companies</Text>
          </View>
          <Text style={styles.tagline}>dexeegroup.com</Text>
        </View>
        <Text style={styles.title}>{labels.title}</Text>
        <Text style={styles.subtitle}>{labels.candidate}: {candidateName} · {labels.date}: {dateText}</Text>
        {type !== "psychometric" ? (
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>{labels.level}</Text>
            <Text style={styles.heroLevel}>{attempt.final_level ?? "—"}</Text>
            {type === "english_oral" ? <Text style={styles.heroLabel}>{labels.verified}</Text> : null}
          </View>
        ) : null}
        {written ? (
          <>
            <View style={styles.section}>
              <Text style={styles.h2}>{labels.mcq}</Text>
              <View style={styles.row}><Text>{written.mcq.correct} / {written.mcq.total}</Text><Text style={styles.muted}>{written.mcq.level}</Text></View>
            </View>
            {written.writing ? (
              <View style={styles.section}>
                <Text style={styles.h2}>{labels.writing}</Text>
                <View style={styles.row}><Text>{written.writing.total} / 20</Text><Text style={styles.muted}>{written.writing.level}</Text></View>
                <Text style={[styles.h2, { marginTop: 8 }]}>{labels.feedback}</Text>
                {written.writing.feedback.map((f, i) => <Text key={i} style={styles.bullet}>• {f}</Text>)}
              </View>
            ) : null}
          </>
        ) : null}
        {oral?.feedback ? (
          <View style={styles.section}>
            <Text style={styles.h2}>{labels.feedback}</Text>
            {oral.feedback.map((f, i) => <Text key={i} style={styles.bullet}>• {f}</Text>)}
          </View>
        ) : null}
        {workstyle ? (
          <>
            <View style={styles.section}>
              <Text style={styles.h2}>{labels.factors}</Text>
              {Object.values(workstyle.factors).map((f) => (
                <View key={f.label.en} style={{ marginBottom: 6 }}>
                  <View style={styles.row}><Text style={{ fontFamily: "Helvetica-Bold" }}>{f.label[locale]}</Text><Text style={styles.muted}>{f.scaled} / 100</Text></View>
                  <Text>{f.preferences[locale]}</Text>
                  <Text style={styles.muted}>{f.environments[locale]}</Text>
                </View>
              ))}
            </View>
            <View style={styles.section}>
              <Text style={styles.h2}>{labels.sjt}</Text>
              <Text>{workstyle.sjt.score} / {workstyle.sjt.total}. {workstyle.sjt.summary[locale]}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.h2}>{labels.strengths}</Text>
              {workstyle.strengths[locale].map((s) => <Text key={s} style={styles.bullet}>• {s}</Text>)}
            </View>
          </>
        ) : null}
        <Text style={styles.footer}>{labels.disclaimer} Dexee S.A.S., Barranquilla, Colombia.</Text>
      </Page>
    </Document>
  );
}
