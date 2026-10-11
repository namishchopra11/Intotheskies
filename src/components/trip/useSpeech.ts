"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeechVoice } from "./speechVoices";

/**
 * Requests ElevenLabs audio through our server; the API key never reaches the browser.
 * If that fails for any reason, the browser's built-in voice reads the text instead.
 */
export function useSpeech(voice: SpeechVoice) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const objectUrl = useRef<string | null>(null);
  // Replay the same briefing without spending more credits during this visit.
  const cached = useRef(new Map<string, Blob>());

  const release = useCallback(() => {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    controller.current?.abort();
    controller.current = null;
    if (audio.current) {
      audio.current.onended = null;
      audio.current.onerror = null;
      audio.current.pause();
      audio.current.removeAttribute("src");
      audio.current.load();
      audio.current = null;
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  }, []);

  useEffect(() => release, [release]);
  useEffect(() => {
    release();
    // Changing the menu preference stops the previous voice without generating new audio.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState("idle");
    setError(null);
  }, [voice, release]);

  const stop = useCallback(() => {
    release();
    setState("idle");
  }, [release]);

  const speakBuiltIn = useCallback(
    (text: string, pending: AbortController) => {
      if (typeof speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined") return false;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = utterance.onerror = () => {
        if (controller.current === pending) {
          release();
          setState("idle");
        }
      };
      speechSynthesis.speak(utterance);
      setState("playing");
      return true;
    },
    [release],
  );

  const speak = useCallback(async (text: string) => {
    if (!text || controller.current) return;
    setError(null);
    setState("loading");
    const pending = new AbortController();
    controller.current = pending;
    const player = new Audio();
    audio.current = player;
    const timeout = setTimeout(() => pending.abort(), 25_000);
    try {
      const cacheKey = `${voice}:${text}`;
      let blob = cached.current.get(cacheKey);
      if (!blob) {
        const response = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice }),
          signal: pending.signal,
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(typeof body?.error === "string" ? body.error : "Couldn't play the summary. Please try again.");
        }
        blob = await response.blob();
        if (controller.current !== pending) return;
        cached.current.set(cacheKey, blob);
      }
      if (controller.current !== pending) return;
      objectUrl.current = URL.createObjectURL(blob);
      player.src = objectUrl.current;
      player.onended = stop;
      player.onerror = () => {
        stop();
        setError("Couldn't play the audio on this device. Please try again.");
      };
      await player.play();
      if (controller.current === pending) setState("playing");
    } catch (e) {
      if (controller.current !== pending) return;
      const timedOut = pending.signal.aborted;
      const fallback = new AbortController();
      release();
      controller.current = fallback;
      if (speakBuiltIn(text, fallback)) return;
      controller.current = null;
      setState("idle");
      setError(timedOut
        ? "The voice service took too long. Please try again."
        : e instanceof Error && !(e instanceof DOMException)
          ? e.message
          : "Couldn't play the summary. Check your connection and try again.");
    } finally {
      clearTimeout(timeout);
    }
  }, [release, stop, speakBuiltIn, voice]);

  return { speaking: state !== "idle", loading: state === "loading", error, speak, stop };
}
