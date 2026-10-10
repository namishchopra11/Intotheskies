// Built-in (premade) voices from ElevenLabs; community voices may require a paid plan.
export const SPEECH_VOICES = {
  george: { id: "JBFqnCBsd6RMkjVDRZzb", label: "George · warm British voice" },
  sarah: { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah · reassuring American voice" },
  alice: { id: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice · clear British voice" },
  roger: { id: "CwhRBWXzGAHq8TQ4Fs17", label: "Roger · relaxed American voice" },
} as const;
export type SpeechVoice = keyof typeof SPEECH_VOICES;
export const DEFAULT_SPEECH_VOICE: SpeechVoice = "george";
