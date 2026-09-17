"use client";

import { CheckCircle2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { uploadViaSignedUrl } from "@/lib/upload";
import { confirmAudioUpload, recordTabLeave, submitAttempt } from "@/server/actions/assessments";
import type { AnswerRow, Attempt, PublicQuestion } from "@/server/services/assessments";

import { AudioRecorder, pickMimeType, type Recording } from "./audio-recorder";
import { CountdownTimer } from "./countdown-timer";

type PromptState = {
  uploaded: boolean;
  reRecords: number;
  previewUrl: string | null;
  uploading: boolean;
  error: string | null;
};

export function OralRunner({
  attempt,
  questions,
  answers,
  resultHref,
  maxBytes,
}: {
  attempt: Attempt;
  questions: PublicQuestion[];
  answers: AnswerRow[];
  resultHref: string;
  maxBytes: number;
}) {
  const t = useTranslations("assessments.oral");
  const tr = useTranslations("assessments.runner");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micState, setMicState] = useState<"idle" | "ready" | "denied" | "unsupported">(() =>
    typeof window !== "undefined" &&
    (!navigator.mediaDevices || typeof MediaRecorder === "undefined")
      ? "unsupported"
      : "idle",
  );
  const [level, setLevel] = useState(0);
  const [index, setIndex] = useState(() =>
    Math.min(questions.length - 1, answers.filter((a) => a.audio_path).length),
  );
  const [states, setStates] = useState<Record<string, PromptState>>(() =>
    Object.fromEntries(
      questions.map((q) => [
        q.id,
        {
          uploaded: answers.some((a) => a.question_id === q.id && a.audio_path),
          reRecords: 0,
          previewUrl: null,
          uploading: false,
          error: null,
        },
      ]),
    ),
  );
  const [pending, start] = useTransition();
  const analyser = useRef<number | null>(null);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void recordTabLeave(attempt.id);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [attempt.id]);

  useEffect(
    () => () => {
      stream?.getTracks().forEach((tr) => tr.stop());
      if (analyser.current) cancelAnimationFrame(analyser.current);
    },
    [stream],
  );

  async function requestMic() {
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      setStream(media);
      setMicState("ready");
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(media);
      const node = ctx.createAnalyser();
      node.fftSize = 256;
      source.connect(node);
      const data = new Uint8Array(node.frequencyBinCount);
      const loop = () => {
        node.getByteFrequencyData(data);
        setLevel(
          Math.min(100, Math.round((data.reduce((s, v) => s + v, 0) / data.length / 255) * 300)),
        );
        analyser.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setMicState("denied");
    }
  }

  const question = questions[index];
  const opts =
    (question?.options as {
      prep_seconds?: number;
      min_seconds?: number;
      max_seconds?: number;
    } | null) ?? {};
  const current = question ? states[question.id] : undefined;
  const allUploaded = questions.every((q) => states[q.id]?.uploaded);

  const handleComplete = useCallback(
    async (recording: Recording) => {
      if (!question) return;
      const ext = recording.mimeType.includes("mp4")
        ? "m4a"
        : recording.mimeType.includes("ogg")
          ? "ogg"
          : "webm";
      const path = `attempts/${attempt.id}/${question.id}.${ext}`;
      setStates((prev) => ({
        ...prev,
        [question.id]: {
          ...prev[question.id]!,
          uploading: true,
          error: null,
          previewUrl: URL.createObjectURL(recording.blob),
        },
      }));
      const upload = await uploadViaSignedUrl({
        bucket: "assessment-audio",
        file: recording.blob,
        path,
        contentType: recording.mimeType.split(";")[0] || "audio/webm",
      });
      if (!upload.ok) {
        setStates((prev) => ({
          ...prev,
          [question.id]: { ...prev[question.id]!, uploading: false, error: t("uploadFailed") },
        }));
        return;
      }
      const confirm = await confirmAudioUpload({
        attempt_id: attempt.id,
        question_id: question.id,
        path,
        duration_seconds: recording.durationSeconds,
      });
      setStates((prev) => ({
        ...prev,
        [question.id]: {
          ...prev[question.id]!,
          uploading: false,
          uploaded: confirm.ok,
          error: confirm.ok ? null : t("uploadFailed"),
        },
      }));
    },
    [attempt.id, question, t],
  );

  function submit() {
    start(async () => {
      const result = await submitAttempt(attempt.id);
      if (result.ok) {
        toast({ title: tr("submitted"), variant: "success" });
        router.push(resultHref);
        router.refresh();
      } else toast({ title: tc("errors.generic"), variant: "danger" });
    });
  }

  if (micState === "unsupported") return <Alert variant="danger">{t("unsupported")}</Alert>;

  if (micState !== "ready") {
    return (
      <div className="border-border mx-auto max-w-lg rounded-[12px] border bg-white p-6 text-center">
        <h2 className="text-lg">{t("micCheck")}</h2>
        <p className="text-muted-foreground mt-2 text-sm">{t("micCheckBody")}</p>
        {micState === "denied" ? (
          <Alert variant="danger" className="mt-4">
            {t("micDenied")}
          </Alert>
        ) : null}
        <Button className="mt-6" variant="accent" onClick={requestMic}>
          {t("micAllow")}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="grid gap-4">
        <div className="bg-mist text-navy flex items-center gap-3 rounded-[10px] px-3 py-2 text-xs">
          <span className="font-medium">{t("micReady")}</span>
          <div className="h-1.5 flex-1 rounded-full bg-white">
            <div
              className="bg-green h-1.5 rounded-full transition-all"
              style={{ width: `${level}%` }}
            />
          </div>
        </div>
        <ol
          className="flex flex-wrap gap-2"
          aria-label={t("prompt", { current: index + 1, total: questions.length })}
        >
          {questions.map((q, i) => (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${i === index ? "border-navy bg-navy text-white" : "border-border bg-white"}`}
                aria-current={i === index ? "step" : undefined}
              >
                {states[q.id]?.uploaded ? (
                  <CheckCircle2Icon className="text-green size-3.5" aria-hidden />
                ) : null}{" "}
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
        {question ? (
          <section className="grid gap-4">
            <div className="border-border rounded-[12px] border bg-white p-5">
              <p className="text-deep-green text-xs font-semibold tracking-wide uppercase">
                {t("prompt", { current: index + 1, total: questions.length })}
              </p>
              <p className="text-navy mt-2 text-lg font-medium">{question.prompt}</p>
            </div>
            {current?.uploaded && !current.uploading ? (
              <div className="border-green/40 bg-mint/40 grid gap-3 rounded-[12px] border p-5">
                <p className="text-success flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2Icon className="size-4" aria-hidden /> {t("uploaded")}
                </p>
                {current.previewUrl ? (
                  <audio
                    controls
                    src={current.previewUrl}
                    className="w-full"
                    aria-label={t("listen")}
                  />
                ) : null}
                {current.reRecords < 1 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-self-start"
                    onClick={() =>
                      setStates((prev) => ({
                        ...prev,
                        [question.id]: {
                          ...prev[question.id]!,
                          uploaded: false,
                          reRecords: prev[question.id]!.reRecords + 1,
                          previewUrl: null,
                        },
                      }))
                    }
                  >
                    {t("reRecord")}
                  </Button>
                ) : (
                  <p className="text-muted-foreground text-xs">{t("reRecordUsed")}</p>
                )}
                {index < questions.length - 1 ? (
                  <Button
                    size="sm"
                    className="justify-self-start"
                    onClick={() => setIndex(index + 1)}
                  >
                    {t("nextPrompt")}
                  </Button>
                ) : null}
              </div>
            ) : current?.uploading ? (
              <Alert>{t("uploading")}</Alert>
            ) : (
              <AudioRecorder
                key={`${question.id}-${current?.reRecords ?? 0}`}
                stream={stream!}
                prepSeconds={opts.prep_seconds ?? 20}
                minSeconds={opts.min_seconds ?? 60}
                maxSeconds={opts.max_seconds ?? 90}
                maxBytes={maxBytes}
                onComplete={handleComplete}
              />
            )}
            {current?.error ? <Alert variant="danger">{current.error}</Alert> : null}
          </section>
        ) : null}
      </div>
      <aside className="grid gap-3 self-start lg:sticky lg:top-24">
        {attempt.expires_at ? (
          <CountdownTimer expiresAt={attempt.expires_at} label={tr("timeLeft")} />
        ) : null}
        <div className="border-border rounded-[12px] border bg-white p-4 text-sm">
          <p className="text-muted-foreground text-xs">{pickMimeType() || "audio"}</p>
          <p className="text-muted-foreground mt-1 text-xs">{tr("tabLeaveNotice")}</p>
          <Button
            variant="accent"
            className="mt-4 w-full"
            disabled={!allUploaded || pending}
            onClick={submit}
          >
            {pending ? tr("submitting") : t("finish")}
          </Button>
        </div>
      </aside>
    </div>
  );
}
