"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";

type MicButtonProps = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
};

type RecorderState = "idle" | "recording" | "transcribing" | "error";

const CANDIDATE_MIME_TYPES = ["audio/webm", "audio/mp4", "audio/ogg"];

function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

/**
 * Voice input button: records a short clip via the browser's MediaRecorder,
 * uploads it to /api/ai/transcribe (Groq Whisper), and hands the
 * transcribed text back to the caller. The caller decides what to do with
 * it (usually: drop it into the chat input for the person to review before
 * sending, same as if they'd typed it).
 */
export function MicButton({ onTranscript, disabled, className }: MicButtonProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  function stopStreamTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    setErrorMessage("");

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setErrorMessage("Voice input isn't supported in this browser.");
      return;
    }

    const mimeType = pickSupportedMimeType();
    if (!mimeType) {
      setState("error");
      setErrorMessage("Voice input isn't supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stopStreamTracks();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await transcribe(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setState("error");
      setErrorMessage("Microphone access was denied.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setState("transcribing");
      mediaRecorderRef.current.stop();
    }
  }

  async function transcribe(blob: Blob) {
    if (blob.size === 0) {
      setState("idle");
      return;
    }

    try {
      const formData = new FormData();
      formData.set("audio", blob);

      const response = await fetch("/api/ai/transcribe", { method: "POST", body: formData });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setState("error");
        setErrorMessage(data?.error ?? "Couldn't transcribe that.");
        return;
      }

      setState("idle");
      if (data?.text) onTranscript(data.text);
    } catch {
      setState("error");
      setErrorMessage("Network error - please try again.");
    }
  }

  function handleClick() {
    if (state === "recording") {
      stopRecording();
      return;
    }
    if (state === "idle" || state === "error") {
      startRecording();
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || state === "transcribing"}
        aria-label={state === "recording" ? "Stop recording" : "Record a voice message"}
        aria-pressed={state === "recording"}
        className={
          className ??
          `flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
            state === "recording"
              ? "animate-pulse bg-red-500 text-white hover:bg-red-600"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`
        }
      >
        {state === "transcribing" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "recording" ? (
          <Square className="h-3.5 w-3.5" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>

      {state === "error" && errorMessage ? (
        <p className="absolute bottom-full right-0 mb-1.5 w-max max-w-[200px] rounded-lg bg-slate-900 px-2 py-1 text-[10px] text-white shadow-lg">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}