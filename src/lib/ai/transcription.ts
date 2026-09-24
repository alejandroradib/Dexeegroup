import "server-only";

import OpenAI from "openai";

import { serverEnv } from "@/lib/env";

const TRANSCRIPTION_TIMEOUT_MS = 120_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;

export type Transcription = { text: string; durationSeconds: number };

export interface TranscriptionProvider {
  transcribe(file: Blob, filename: string): Promise<Transcription>;
}

/** OpenAI Whisper implementation; swap the provider through `getTranscriptionProvider`. */
class WhisperProvider implements TranscriptionProvider {
  private client: OpenAI;
  constructor(apiKey: string) {
    // Explicit ceilings (audit I14); a 3 MB upload transcribes in well under two minutes.
    this.client = new OpenAI({ apiKey, timeout: TRANSCRIPTION_TIMEOUT_MS, maxRetries: 2 });
  }
  async transcribe(file: Blob, filename: string): Promise<Transcription> {
    const upload = new File([file], filename, { type: file.type || "audio/webm" });
    const result = await this.client.audio.transcriptions.create({
      file: upload,
      model: "whisper-1",
      language: "en",
      response_format: "verbose_json",
    });
    const verbose = result as unknown as { text: string; duration?: number };
    return { text: verbose.text ?? "", durationSeconds: Number(verbose.duration ?? 0) };
  }
}

let provider: TranscriptionProvider | undefined;

export function getTranscriptionProvider(): TranscriptionProvider {
  if (provider) return provider;
  const env = serverEnv();
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  provider = new WhisperProvider(env.OPENAI_API_KEY);
  return provider;
}

export function transcriptionConfigured(): boolean {
  return Boolean(serverEnv().OPENAI_API_KEY);
}

/** Downloads a private storage object and transcribes it. */
export async function transcribe(
  fileUrl: string,
  filename = "answer.webm",
): Promise<Transcription> {
  const response = await fetch(fileUrl, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`audio_download_failed_${response.status}`);
  const blob = await response.blob();
  return getTranscriptionProvider().transcribe(blob, filename);
}
