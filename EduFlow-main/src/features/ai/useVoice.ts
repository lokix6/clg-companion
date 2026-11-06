import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { aiSpeak, aiTranscribeAudio } from "@/lib/ai-voice.functions";
import { chunkForSpeech, startRecording } from "@/lib/ai/voice";

/** Records mic audio and transcribes it via the backend. */
export function useVoiceInput(onTranscript: (text: string) => void) {
  const transcribe = useServerFn(aiTranscribeAudio);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recRef = useRef<Awaited<ReturnType<typeof startRecording>> | null>(null);

  useEffect(() => () => recRef.current?.cancel(), []);

  const start = useCallback(async () => {
    try {
      recRef.current = await startRecording();
      setRecording(true);
    } catch {
      toast.error("Microphone access is needed to use voice input.");
    }
  }, []);

  const stop = useCallback(async () => {
    const rec = recRef.current;
    recRef.current = null;
    setRecording(false);
    if (!rec) return;
    setTranscribing(true);
    try {
      const audioBase64 = await rec.stop();
      const res = await transcribe({ data: { audioBase64 } });
      onTranscript(res.text);
    } catch (e) {
      toast.error((e as Error).message || "Couldn't transcribe that recording.");
    } finally {
      setTranscribing(false);
    }
  }, [onTranscript, transcribe]);

  const cancel = useCallback(() => {
    recRef.current?.cancel();
    recRef.current = null;
    setRecording(false);
  }, []);

  return { recording, transcribing, start, stop, cancel };
}

/** Speaks assistant text aloud, chunk by chunk. */
export function useVoiceOutput() {
  const speakFn = useServerFn(aiSpeak);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tokenRef = useRef(0);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeakingId(null);
    setLoadingId(null);
  }, []);

  useEffect(() => stop, [stop]);

  const speak = useCallback(
    async (id: string, text: string) => {
      if (speakingId === id || loadingId === id) {
        stop();
        return;
      }
      stop();
      const token = tokenRef.current;
      const chunks = chunkForSpeech(text);
      if (chunks.length === 0) return;
      setLoadingId(id);
      try {
        for (const chunk of chunks) {
          const res = await speakFn({ data: { text: chunk, voice: "shimmer" } });
          if (token !== tokenRef.current) return;
          setLoadingId(null);
          setSpeakingId(id);
          await new Promise<void>((resolve, reject) => {
            const audio = new Audio(`data:${res.mime};base64,${res.audioBase64}`);
            audioRef.current = audio;
            audio.onended = () => resolve();
            audio.onerror = () => reject(new Error("Audio playback failed."));
            void audio.play().catch(reject);
          });
          if (token !== tokenRef.current) return;
        }
      } catch (e) {
        if (token === tokenRef.current) toast.error((e as Error).message || "Couldn't play the response.");
      } finally {
        if (token === tokenRef.current) {
          setSpeakingId(null);
          setLoadingId(null);
        }
      }
    },
    [loadingId, speakFn, speakingId, stop],
  );

  return { speak, stop, speakingId, loadingId };
}
