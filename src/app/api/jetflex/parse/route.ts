// POST /api/jetflex/parse  { text, today?, base?, refine? }  ->  { source: "llm" | "regex", request, understood, assumptions, question }
//
// Uses the Anthropic Messages API when ANTHROPIC_API_KEY is set; otherwise, or when the call fails,
// times out or returns something that does not validate, answers with the rule-based parser. The key
// is read on the server only and never sent to the browser.
import { z } from "zod";
import { MAX_TEXT, parseWithFallback, TripRequestSchema } from "@/lib/jetflex/llmParser";
import { parseRequest } from "@/lib/jetflex/parser";
import { defaultRequest } from "@/lib/jetflex/search";
import { isValidDate } from "@/lib/jetflex/time";
import type { TripRequest } from "@/lib/jetflex/types";

const Body = z.object({
  text: z.string().min(1).max(MAX_TEXT * 2),
  today: z.string().refine(isValidDate).optional(),
  base: z.unknown().optional(),
  refine: z.boolean().optional(),
});

const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Send JSON: { text, today?, base?, refine? }" }, { status: 400, headers });
  }
  const body = Body.safeParse(raw);
  if (!body.success) return Response.json({ error: "text is required (a short trip description)" }, { status: 400, headers });

  const today = body.data.today ?? new Date().toISOString().slice(0, 10);
  const parsedBase = TripRequestSchema.safeParse(body.data.base);
  const base: TripRequest = parsedBase.success ? (parsedBase.data as TripRequest) : defaultRequest(today);
  try {
    const out = await parseWithFallback(body.data.text, { today, base, refine: body.data.refine }, { apiKey: process.env.ANTHROPIC_API_KEY });
    const { fallbackReason, ...result } = out;
    void fallbackReason; // kept server-side so error details never reach the browser
    return Response.json(result, { headers });
  } catch {
    // parseWithFallback does not throw; this is a last line of defence so the client always gets a regex answer.
    return Response.json({ source: "regex", ...parseRequest(body.data.text, today, base, body.data.refine ?? false) }, { headers });
  }
}
