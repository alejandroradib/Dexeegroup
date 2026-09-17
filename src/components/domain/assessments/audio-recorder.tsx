"use client";

import { MicIcon, SquareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RecorderState = "idle" | "preparing" | "recording" | "done";

export type Recording = { blob: Blob; durationSeconds: number; mimeType: string };

type Props = {
  prepSeconds: number;
  minSeconds: number;
  maxSeconds: number;
  maxBytes: number;
  stream: MediaStream;
  onComplete: (recording: Recording) => void;
  disabled?: boolean;
};

export function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

/** Preparation countdown, timed recording (auto-stop at max), single result callback. */
export function AudioRecorder({ prepSeconds, minSeconds, maxSeconds, maxBytes, stream, onComplete, disabled }: Props) {
  const t = useTranslations("assessments.oral");
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(prepSeconds);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };

  const stopRecording = useCallback(() => {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
  }, []);

  const startRecording = useCallback(() => {
    clearTimer();
    setError(null);
    const mimeType = pickMimeType();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 48000 } : undefined);
    chunks.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
    rec.onstop = () => {
      clearTimer();
      const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
      const blob = new Blob(chunks.current, { type: rec.mimeType || mimeType || "audio/webm" });
      setState("done");
      if (durationSeconds < minSeconds) { setError(t("tooShort")); return; }
      if (blob.size > maxBytes) { setError(t("tooLarge")); return; }
      onComplete({ blob, durationSeconds, mimeType: blob.type });
    };
    recorder.current = rec;
    startedAt.current = Date.now();
    rec.start(1000);
    setState("recording");
    setSeconds(maxSeconds);
    timer.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
      setSeconds(Math.max(0, maxSeconds - elapsed));
      if (elapsed >= maxSeconds) stopRecording();
    }, 250);
  }, [stream, minSeconds, maxSeconds, maxBytes, onComplete, stopRecording, t]);

  const startPreparation = useCallback(() => {
    setState("preparing");
    setSeconds(prepSeconds);
    startedAt.current = Date.now();
    clearTimer();
    timer.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
      const left = prepSeconds - elapsed;
      setSeconds(Math.max(0, left));
      if (left <= 0) startRecording();
    }, 250);
  }, [prepSeconds, startRecording]);

  useEffect(() => () => { clearTimer(); if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop(); }, []);

  const elapsed = state === "recording" ? maxSeconds - seconds : 0;
  return (
    <div className="grid gap-3 rounded-[12px] border border-border bg-white p-5">
      {state === "idle" ? (
        <Button variant="accent" onClick={startPreparation} disabled={disabled}><MicIcon /> {t("prepare")}</Button>
      ) : null}
      {state === "preparing" ? (
        <div className="grid gap-3">
          <p className="text-sm font-medium text-navy">{t("prepare")}</p>
          <p className="font-heading text-4xl font-extrabold text-navy tabular-nums" aria-live="polite">{t("prepareLeft", { seconds })}</p>
          <Button variant="outline" onClick={startRecording}><MicIcon /> {t("startNow")}</Button>
        </div>
      ) : null}
      {state === "recording" ? (
        <div className="grid gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-danger"><span className="size-2.5 animate-pulse rounded-full bg-danger" aria-hidden /> {t("recording")}</p>
          <p className="font-heading text-4xl font-extrabold text-navy tabular-nums" aria-live="polite">{t("recordingLeft", { seconds })}</p>
          <div className="h-2 w-full rounded-full bg-mist"><div className={cn("h-2 rounded-full", elapsed >= minSeconds ? "bg-green" : "bg-navy")} style={{ width: `${(elapsed / maxSeconds) * 100}%` }} /></div>
          <p className="text-xs text-muted-foreground">{t("minReached")}</p>
          <Button variant="destructive" onClick={stopRecording} disabled={elapsed < minSeconds}><SquareIcon /> {t("stop")}</Button>
        </div>
      ) : null}
      {error ? <Alert variant="danger">{error}</Alert> : null}
    </div>
  );
}
