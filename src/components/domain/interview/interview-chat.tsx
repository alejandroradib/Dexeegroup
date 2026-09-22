"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { CountdownTimer } from "@/components/domain/assessments/countdown-timer";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import {
  awaitingCandidate,
  canFinish,
  INTERVIEW_MESSAGE_MAX_CHARS,
  parseTranscript,
  turnsRemaining,
  type InterviewTurn,
} from "@/lib/interview/conversation";
import { finishInterview, sendInterviewMessage } from "@/server/actions/interview";
import type { MockInterview } from "@/server/services/interviews";

type ChatError =
  | "aiUnavailable"
  | "aiFailed"
  | "interviewClosed"
  | "turnsExhausted"
  | "rateLimited"
  | "incomplete"
  | "generic";

/**
 * Turn-by-turn interview. The interviewer's turns arrive from the server action; the
 * candidate types a reply, sends it and waits. Finishing is allowed once the minimum number
 * of replies is in, and the interviewer's own closing turn ends it automatically.
 */
export function InterviewChat({ interview }: { interview: MockInterview }) {
  const t = useTranslations("interview.chat");
  const tr = useTranslations("assessments.runner");
  const router = useRouter();
  const [transcript, setTranscript] = useState<InterviewTurn[]>(() =>
    parseTranscript(interview.transcript),
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<ChatError | null>(null);
  const [closing, setClosing] = useState(false);
  const [pending, start] = useTransition();
  const [finishing, startFinish] = useTransition();
  const endRef = useRef<HTMLDivElement | null>(null);
  const openingRequested = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [transcript.length, pending]);

  // The opening turn is normally generated when the interview starts; if that call failed
  // the transcript is empty and the interviewer is asked to open now.
  useEffect(() => {
    if (transcript.length > 0 || openingRequested.current) return;
    openingRequested.current = true;
    start(async () => {
      const result = await sendInterviewMessage(interview.id, { text: "-" });
      if (result.ok) setTranscript(result.data.transcript);
      else setError(toChatError(result.error));
    });
  }, [interview.id, transcript.length]);

  function finish() {
    startFinish(async () => {
      const result = await finishInterview(interview.id);
      if (result.ok) {
        router.push(`/candidate/interview/${interview.id}/result`);
        router.refresh();
        return;
      }
      setError(toChatError(result.error));
    });
  }

  function send() {
    const text = draft.trim();
    if (!text || pending || closing) return;
    setError(null);
    const optimistic: InterviewTurn[] = [
      ...transcript,
      { role: "candidate", text, at: new Date().toISOString() },
    ];
    setTranscript(optimistic);
    setDraft("");
    start(async () => {
      const result = await sendInterviewMessage(interview.id, { text });
      if (!result.ok) {
        setTranscript(transcript);
        setDraft(text);
        setError(toChatError(result.error));
        return;
      }
      setTranscript(result.data.transcript);
      if (result.data.done) {
        setClosing(true);
        finish();
      }
    });
  }

  const remaining = turnsRemaining(transcript);
  const yourTurn = awaitingCandidate(transcript) && !pending && !closing;
  const chars = draft.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="grid gap-4">
        <section
          className="border-border flex max-h-[60vh] min-h-[320px] flex-col gap-3 overflow-y-auto rounded-[12px] border bg-white p-4 sm:p-6"
          aria-live="polite"
          aria-label={t("transcriptLabel")}
        >
          {transcript.map((turn, i) => (
            <div
              key={`${turn.at}-${i}`}
              className={turn.role === "interviewer" ? "flex justify-start" : "flex justify-end"}
            >
              <div
                className={
                  turn.role === "interviewer"
                    ? "bg-mist text-navy max-w-[85%] rounded-[12px] rounded-bl-sm px-4 py-3 text-sm"
                    : "bg-navy max-w-[85%] rounded-[12px] rounded-br-sm px-4 py-3 text-sm text-white"
                }
              >
                <p className="mb-1 text-[11px] font-semibold uppercase opacity-70">
                  {turn.role === "interviewer" ? t("interviewer") : t("you")}
                </p>
                <p className="whitespace-pre-line">{turn.text}</p>
              </div>
            </div>
          ))}
          {pending ? (
            <p className="text-muted-foreground text-xs" role="status">
              {t("typing")}
            </p>
          ) : null}
          <div ref={endRef} />
        </section>

        {error ? (
          <Alert variant={error === "aiFailed" || error === "generic" ? "danger" : "warning"}>
            {t(`errors.${error}` as "errors.generic")}
          </Alert>
        ) : null}

        <section className="border-border rounded-[12px] border bg-white p-4 sm:p-6">
          <Label htmlFor="reply" className="text-sm font-medium">
            {t("replyLabel")}
          </Label>
          <Textarea
            id="reply"
            rows={5}
            className="mt-2"
            value={draft}
            maxLength={INTERVIEW_MESSAGE_MAX_CHARS}
            disabled={!yourTurn || remaining === 0}
            placeholder={yourTurn ? t("placeholder") : t("wait")}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-muted-foreground text-xs">
              {chars}/{INTERVIEW_MESSAGE_MAX_CHARS} · {t("sendHint")}
            </span>
            <div className="flex items-center gap-2">
              {canFinish(transcript) && !closing ? (
                <ConfirmButton
                  variant="outline"
                  title={t("finish")}
                  description={t("finishConfirm")}
                  disabled={pending || finishing}
                  onConfirm={finish}
                >
                  {finishing ? t("finishing") : t("finish")}
                </ConfirmButton>
              ) : null}
              <Button
                variant="accent"
                onClick={send}
                disabled={!yourTurn || !draft.trim() || remaining === 0}
              >
                {t("send")}
              </Button>
            </div>
          </div>
        </section>
        {closing ? <Alert variant="success">{t("closing")}</Alert> : null}
      </div>
      <aside className="grid gap-3 self-start lg:sticky lg:top-24">
        <CountdownTimer expiresAt={interview.expires_at} label={tr("timeLeft")} />
        <p className="text-muted-foreground text-xs">{t("remaining", { count: remaining })}</p>
        <p className="text-muted-foreground text-xs">{t("tip")}</p>
      </aside>
    </div>
  );
}

function toChatError(code: string): ChatError {
  switch (code) {
    case "aiUnavailable":
    case "aiFailed":
    case "interviewClosed":
    case "turnsExhausted":
    case "rateLimited":
    case "incomplete":
      return code;
    default:
      return "generic";
  }
}
