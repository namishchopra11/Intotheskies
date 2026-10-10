import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { SPEECH_VOICES } from "@/components/trip/speechVoices";

const request = (body: unknown) => new Request("http://localhost/api/speak", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.stubEnv("ELEVENLABS_API_KEY", "test-key-never-real");
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("speech route", () => {
  it.each([{}, { text: "" }, { text: "   " }, { text: 5 }, { text: "a".repeat(1201) }, { text: "Hello", trip: {} }, ["Hello"], null, { text: "Hello", voice: "paid-or-unknown" }, { text: "Hello", voice: "https://example.com" }])("rejects invalid input without calling ElevenLabs: %j", async (input) => {
    expect((await POST(request(input))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects wrong content types and malformed JSON", async () => {
    expect((await POST(new Request("http://localhost/api/speak", { method: "POST", body: "hello" }))).status).toBe(415);
    expect((await POST(new Request("http://localhost/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("caps actual body bytes even without a Content-Length header", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(8193)); }, cancel,
    });
    const input = new Request("http://localhost/api/speak", {
      method: "POST", headers: { "Content-Type": "application/json" }, body,
      duplex: "half",
    } as RequestInit);
    expect((await POST(input)).status).toBe(413);
    expect(cancel).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails helpfully with no key without an upstream request", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    const response = await POST(request({ text: "Your flight is delayed." }));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("isn't set up yet");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends only trimmed briefing text and returns uncached audio", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/mpeg" } }));
    const response = await POST(request({ text: "  Your flight is delayed.  " }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("https://api.elevenlabs.io/v1/text-to-speech/");
    expect(options?.headers).toMatchObject({ "xi-api-key": "test-key-never-real" });
    expect(JSON.parse(options?.body as string)).toEqual({ text: "Your flight is delayed.", model_id: "eleven_multilingual_v2" });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(response.headers.has("xi-api-key")).toBe(false);
  });

  it.each(Object.entries(SPEECH_VOICES))("uses the allowed built-in voice %s", async (voice, choice) => {
    vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array([1]), { headers: { "Content-Type": "audio/mpeg" } }));
    expect((await POST(request({ text: "Hello", voice }))).status).toBe(200);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(`https://api.elevenlabs.io/v1/text-to-speech/${choice.id}?output_format=mp3_44100_128`);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not leak upstream errors or the key", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("private upstream detail test-key-never-real", { status: 401 }));
    const response = await POST(request({ text: "Hello" }));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toMatch(/private upstream|test-key-never-real/);
  });

  it("handles upstream connection failures", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("secret upstream failure"));
    const response = await POST(request({ text: "Hello" }));
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain("Check your connection");
  });

  it.each([402, 429])("stops at a provider limit without retrying or suggesting payment: %s", async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response("private quota details", { status }));
    const response = await POST(request({ text: "Hello" }));
    expect(response.status).toBe(429);
    expect((await response.json()).error).toContain("no paid upgrade is needed");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects non-audio and empty upstream responses", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { headers: { "Content-Type": "application/json" } }));
    expect((await POST(request({ text: "Hello" }))).status).toBe(502);
    vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array(), { headers: { "Content-Type": "audio/mpeg" } }));
    expect((await POST(request({ text: "Hello" }))).status).toBe(502);
  });
});
