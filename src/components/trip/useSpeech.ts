"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Most human-sounding first. Browsers name their neural voices differently:
// Edge "Microsoft Aria Online (Natural)", Android "… (Neural)", Apple "Ava (Premium)" /
// "Samantha (Enhanced)", Chrome "Google US English".
const PREFERRED = [
  /natural/i,
  /neural/i,
  /premium/i,
  /enhanced/i,
  /siri/i,
  /google us english/i,
  /google uk english female/i,
  /^ava\b/i,
  /^allison\b/i,
  /^samantha\b/i,
  /^serena\b/i,
  /^karen\b/i,
  /^daniel\b/i,
  /^moira\b/i,
];

// macOS novelty voices that sound like robots or sing.
const NOVELTY =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|fred|good news|hysterical|jester|junior|organ|pipe|ralph|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|rocko|shelley|eddy|flo|reed|sandy/i;

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang) && !NOVELTY.test(v.name));
  for (const re of PREFERRED) {
    const match = english.find((v) => re.test(v.name));
    if (match) return match;
  }
  return english.find((v) => v.lang.replace("_", "-") === "en-US") ?? english[0] ?? null;
}

/** "First sentence. Second one!" -> ["First sentence.", "Second one!"] */
function sentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}

/**
 * Text-to-speech with the most natural voice the phone has. Speaks one sentence at a time,
 * a touch slower than default, which sounds less robotic and avoids Chrome cutting off long
 * utterances.
 */
export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voice = useRef<SpeechSynthesisVoice | null>(null);
  const run = useRef(0);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const load = () => {
      voice.current = pickVoice(synth.getVoices());
    };
    load();
    // Read after mount so server and client render the same buttons.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true);
    synth.addEventListener("voiceschanged", load);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      synth.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    run.current++;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;
    synth.cancel();
    const id = ++run.current;
    const parts = sentences(text);
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part);
      if (voice.current) {
        u.voice = voice.current;
        u.lang = voice.current.lang;
      }
      u.rate = 0.94;
      u.pitch = 1.02;
      if (i === parts.length - 1) {
        u.onend = () => id === run.current && setSpeaking(false);
      }
      u.onerror = () => id === run.current && setSpeaking(false);
      synth.speak(u);
    });
    setSpeaking(true);
  }, []);

  return { supported, speaking, speak, stop };
}
