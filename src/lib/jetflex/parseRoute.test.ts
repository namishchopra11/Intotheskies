import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/jetflex/parse/route";
import { EXAMPLE_PROMPTS, parseRequest } from "./parser";
import { defaultRequest } from "./search";
import { addDays, nextDow } from "./time";

const today = "2026-10-10";
const fri = nextDow(today, 5);
const post = (body: unknown, raw = false) =>
  POST(new Request("http://localhost/api/jetflex/parse", { method: "POST", headers: { "content-type": "application/json" }, body: raw ? (body as string) : JSON.stringify(body) }));
const modelReply = (obj: unknown) => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: JSON.stringify(obj) }] }) }) as unknown as Response;

describe("POST /api/jetflex/parse", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock); // nothing in this file may reach the network
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns source regex, and never calls the model, when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await post({ text: EXAMPLE_PROMPTS[0], today });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("regex");
    expect(body.request).toEqual(parseRequest(EXAMPLE_PROMPTS[0], today, defaultRequest(today)).request);
    expect(body).not.toHaveProperty("fallbackReason");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns source llm when the model answers with valid JSON", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    fetchMock.mockResolvedValue(modelReply({ from: "lax", to: "sfo", departDate: fri, returnDate: addDays(fri, 2), pax: 2, priority: "fastest" }));
    const body = await (await post({ text: "two of us LA to SF Friday, back Sunday, fastest", today })).json();
    expect(body.source).toBe("llm");
    expect(body.request).toMatchObject({ from: "lax", to: "sfo", pax: 2, preset: "fastest", departDate: fri });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.anthropic.com/v1/messages");
  });

  it.each([
    ["the call throws", () => fetchMock.mockRejectedValue(new Error("network down"))],
    ["the API returns 529", () => fetchMock.mockResolvedValue({ ok: false, status: 529, json: async () => ({}) })],
    ["the output fails validation", () => fetchMock.mockResolvedValue(modelReply({ from: "paris", to: "mia" }))],
  ])("falls back to regex when %s, with a 200", async (_n, arrange) => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    arrange();
    const res = await post({ text: EXAMPLE_PROMPTS[0], today });
    expect(res.status).toBe(200);
    expect((await res.json()).source).toBe("regex");
  });

  it("uses the base request from the client and ignores a malformed one", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const base = { ...defaultRequest(today), pax: 7 };
    const withBase = await (await post({ text: "to Aspen on Friday", today, base })).json();
    expect(withBase.request.pax).toBe(7);
    const junk = await (await post({ text: "to Aspen on Friday", today, base: { pax: "lots" } })).json();
    expect(junk.request.pax).toBe(defaultRequest(today).pax);
  });

  it("answers 400 (not 500) for bodies it cannot use", async () => {
    expect((await post("{not json", true)).status).toBe(400);
    expect((await post({})).status).toBe(400);
    expect((await post({ text: "" })).status).toBe(400);
    expect((await post({ text: "hi", today: "2026-02-31" })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
