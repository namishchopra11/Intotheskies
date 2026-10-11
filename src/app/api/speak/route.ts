import { z } from "zod";
import { DEFAULT_SPEECH_VOICE, SPEECH_VOICES } from "@/components/trip/speechVoices";

const MAX_BODY_BYTES = 8192;
const SpeakRequest = z.object({
  text: z.string().trim().min(1).max(1200),
  voice: z.enum(["george", "sarah", "alice", "roger"]).default(DEFAULT_SPEECH_VOICE),
}).strict();
const noStore = { "Cache-Control": "no-store" };
const fail = (message: string, status: number) => Response.json({ error: message }, { status, headers: noStore });

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return fail("Send a JSON object containing only briefing text.", 415);
  }

  // Limit the bytes actually read, including chunked requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return fail("Enter briefing text to read aloud.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return fail("The briefing is too long to read aloud.", 413);
      }
      chunks.push(value);
    }
  } catch {
    return fail("Couldn't read the briefing request.", 400);
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return fail("Send a valid JSON object containing only briefing text.", 400);
  }
  const parsed = SpeakRequest.safeParse(input);
  if (!parsed.success) return fail("Choose an available voice and send briefing text between 1 and 1,200 characters.", 400);

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return fail("Listen isn't set up yet. The team needs to add the ElevenLabs API key.", 503);

  try {
    // Voice and request format from ElevenLabs' official Create speech example.
    const audio = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${SPEECH_VOICES[parsed.data.voice].id}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "xi-api-key": apiKey, Accept: "audio/mpeg" },
        body: JSON.stringify({ text: parsed.data.text, model_id: "eleven_multilingual_v2" }),
        cache: "no-store",
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]),
      },
    );
    if (!audio.ok || !audio.headers.get("content-type")?.startsWith("audio/")) {
      await audio.body?.cancel();
      if (audio.status === 402 || audio.status === 429) {
        return fail("The voice service has reached a credit or usage limit. Wait and try later; no paid upgrade is needed.", 429);
      }
      return fail("Couldn't create the audio. Please try again.", 502);
    }
    const body = await audio.arrayBuffer();
    if (body.byteLength === 0) return fail("Couldn't create the audio. Please try again.", 502);
    return new Response(body, { headers: { ...noStore, "Content-Type": "audio/mpeg" } });
  } catch {
    return fail("Couldn't reach the voice service. Check your connection and try again.", 502);
  }
}
