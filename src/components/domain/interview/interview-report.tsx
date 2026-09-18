import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { InterviewReport as Report } from "@/lib/ai/prompts/mock-interview";
import type { InterviewQuestion } from "@/lib/interview/questions";
import { interviewBand } from "@/lib/interview/scoring";
import type { MockInterview } from "@/server/services/interviews";

export function InterviewReportView({ interview }: { interview: MockInterview }) {
  const t = useTranslations("interview.report");
  const report = interview.report as Report | null;
  const questions = (interview.questions as unknown as InterviewQuestion[]) ?? [];
  const answers = (interview.answers as Record<string, string> | null) ?? {};
  if (!report) return <Alert variant="danger">{t("failed")}</Alert>;
  const band = interviewBand(report.overall);
  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="grid gap-4 self-start">
        <div className="bg-navy rounded-[16px] p-8 text-white">
          <p className="text-sm text-white/70">{t("overall")}</p>
          <p className="font-heading text-green mt-2 text-5xl font-extrabold">
            {report.overall}
            <span className="text-2xl text-white/60">/20</span>
          </p>
          <Badge variant="accent" className="mt-3">
            {t(`band.${band}`)}
          </Badge>
        </div>
        <ul className="border-border grid gap-2 rounded-[12px] border bg-white p-4 text-sm">
          {Object.entries(report.scores).map(([key, value]) => (
            <li key={key} className="grid grid-cols-[1fr_80px_30px] items-center gap-2">
              <span>{t(`scores.${key as "communication"}`)}</span>
              <div className="bg-mist h-2 rounded-full">
                <div
                  className="bg-green h-2 rounded-full"
                  style={{ width: `${(value / 5) * 100}%` }}
                />
              </div>
              <span className="text-right font-semibold">{value}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">{t("notice")}</p>
      </div>
      <div className="grid gap-6">
        <section className="border-border rounded-[12px] border bg-white p-5">
          <h2 className="text-base">{t("summary")}</h2>
          <p className="mt-2 text-sm">{report.summary}</p>
        </section>
        <div className="grid gap-6 sm:grid-cols-2">
          <section className="border-border rounded-[12px] border bg-white p-5">
            <h2 className="text-base">{t("strengths")}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {report.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
          <section className="border-border rounded-[12px] border bg-white p-5">
            <h2 className="text-base">{t("improvements")}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {report.improvements.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        </div>
        <section className="border-border rounded-[12px] border bg-white p-5">
          <h2 className="text-base">{t("perQuestion")}</h2>
          <ol className="mt-3 grid gap-4">
            {questions.map((q, i) => {
              const comment = report.per_question.find((c) => c.id === q.id)?.comment;
              return (
                <li key={q.id} className="bg-mist rounded-[10px] p-4 text-sm">
                  <p className="text-navy font-medium">
                    {i + 1}. {q.text}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs font-semibold uppercase">
                    {t("yourAnswer")}
                  </p>
                  <p className="mt-1 whitespace-pre-line">{answers[q.id]}</p>
                  {comment ? (
                    <p className="border-border text-navy mt-2 border-t pt-2">{comment}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
