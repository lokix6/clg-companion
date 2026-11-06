import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TRANSCRIBE_URL = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";
const SPEECH_URL = "https://ai.gateway.lovable.dev/v1/audio/speech";
const STT_MODEL = "openai/gpt-4o-mini-transcribe";
const TTS_MODEL = "openai/gpt-4o-mini-tts";

function apiKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Voice service is not configured on the server.");
  return key;
}

function mapStatus(status: number, txt: string): Error {
  if (status === 429) return new Error("Voice rate limit reached. Please retry shortly.");
  if (status === 402) return new Error("AI credits exhausted. Please add credits to continue.");
  if (status === 404) return new Error("Voice features are not enabled for this workspace.");
  return new Error(`Voice service error [${status}]: ${txt.slice(0, 300)}`);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/* ---------- Speech to text ---------- */
const TranscribeInput = z.object({
  // base64-encoded WAV audio (16 kHz mono recommended)
  audioBase64: z.string().min(2000, "That recording was too short — please try again."),
});

export const aiTranscribeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TranscribeInput.parse(d))
  .handler(async ({ data }) => {
    const bytes = base64ToBytes(data.audioBase64);
    if (bytes.byteLength > 20 * 1024 * 1024) {
      throw new Error("Recording is too long. Please keep it under a couple of minutes.");
    }

    const form = new FormData();
    form.append("model", STT_MODEL);
    form.append("file", new Blob([bytes as unknown as BlobPart], { type: "audio/wav" }), "recording.wav");

    const res = await fetch(TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}` },
      body: form,
    });
    if (!res.ok) throw mapStatus(res.status, await res.text().catch(() => ""));

    const json = (await res.json()) as { text?: string };
    const text = (json.text ?? "").trim();
    if (!text) throw new Error("Couldn't hear anything in that recording. Please try again.");
    return { text };
  });

/* ---------- Text to speech ---------- */
const SpeakInput = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().max(40).default("shimmer"),
});

export const aiSpeak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SpeakInput.parse(d))
  .handler(async ({ data }) => {
    const res = await fetch(SPEECH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        input: data.text,
        voice: data.voice,
        response_format: "mp3",
        speed: 0.98,
        instructions:
          "Speak as a warm, friendly young woman tutoring a student one-on-one. Sound completely natural and human — never robotic or monotone. Use relaxed conversational pacing, gentle breaths and natural pauses at commas and full stops, soft rising and falling intonation, and light emphasis on key words. Keep the tone calm, encouraging and smooth.",
      }),
    });
    if (!res.ok) throw mapStatus(res.status, await res.text().catch(() => ""));

    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0) throw new Error("Voice service returned no audio.");
    return { audioBase64: bytesToBase64(buf), mime: "audio/mpeg" };
  });
