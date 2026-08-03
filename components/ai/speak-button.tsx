"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

type SpeakButtonProps = {
  text: string;
  className?: string;
};

/**
 * Reads a single assistant message aloud using the browser's built-in
 * speechSynthesis API - free, no backend call, no API quota. Deliberately
 * per-message and click-to-play rather than auto-speaking every reply,
 * which would be intrusive in a shopping/dashboard context.
 */
export function SpeakButton({ text, className }: SpeakButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Plain capability check, not stored state - it never changes during the
  // component's lifetime, so there's no need for useState+useEffect here
  // (and no synchronous setState-in-effect to worry about).
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isSupported || !text.trim()) return null;

  function toggle() {
    const synth = window.speechSynthesis;

    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    synth.cancel(); // stop anything else currently playing
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synth.speak(utterance);
    setIsSpeaking(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isSpeaking ? "Stop reading aloud" : "Read this message aloud"}
      className={
        className ??
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      }
    >
      {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
    </button>
  );
}