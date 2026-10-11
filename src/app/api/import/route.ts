import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ImportResultSchema } from "@/app/trip/importSchema";

/**
 * Reads flight, hotel and ride confirmations (screenshots, PDFs or pasted email text) with
 * Claude and returns the bookings as structured data. Nothing is stored here: the upload is
 * read and the result goes straight back to the phone, which keeps the trip.
 *
 * Needs ANTHROPIC_API_KEY in .env.local (or the host's environment).
 */

const MAX_FILES = 6;
const MAX_TOTAL_BYTES = 24 * 1024 * 1024; // well under the API's 32 MB request limit
const MAX_TEXT_CHARS = 60_000;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const SYSTEM = `You read travel confirmations (airline e-tickets and itineraries, hotel bookings, ride and transfer bookings) and pull out the bookings.

Rules:
- Times are local wall-clock times at that place, written "YYYY-MM-DDTHH:mm" with no timezone and no conversion. Copy the time printed for each place: departure time at the departure airport, arrival time at the arrival airport.
- If the year is not printed, infer it from the rest of the document (booking date, other dates); mention that in notes.
- A connecting itinerary is several flights: list each leg separately.
- For a hotel that prints only dates, use 15:00 for check-in and 11:00 for check-out, and say so in notes.
- Airports are 3-letter IATA codes. If only a city or airport name is printed and the code is well known, use it; otherwise use the name as printed and say so in notes.
- Use null for anything not shown. Never invent confirmation numbers, seats, phone numbers or times.
- Ignore marketing, upsells, fare rules and anything that is not a booking.
- Return empty lists if the input contains no bookings, and say why in notes.`;

function json(status: number, body: unknown) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return json(503, { error: "Import isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart." });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: "Send the confirmation as a form upload." });
  }

  const text = String(form.get("text") ?? "").trim().slice(0, MAX_TEXT_CHARS);
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!text && files.length === 0) return json(400, { error: "Add a screenshot, a PDF or the email text." });
  if (files.length > MAX_FILES) return json(400, { error: `Up to ${MAX_FILES} files at a time.` });
  if (files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES) {
    return json(413, { error: "Those files are too big. Try fewer pages or smaller screenshots." });
  }

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const file of files) {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    if (file.type === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
    } else if ((IMAGE_TYPES as readonly string[]).includes(file.type)) {
      content.push({ type: "image", source: { type: "base64", media_type: file.type as ImageType, data } });
    } else if (file.type.startsWith("text/") || file.name.endsWith(".eml")) {
      content.push({ type: "text", text: `<file name="${file.name}">\n${(await file.text()).slice(0, MAX_TEXT_CHARS)}\n</file>` });
    } else {
      return json(415, { error: `Can't read ${file.name}. Use a photo, screenshot, PDF or text.` });
    }
  }
  if (text) content.push({ type: "text", text: `<pasted>\n${text}\n</pasted>` });
  content.push({ type: "text", text: "Pull out every flight, hotel and ride booking above." });

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { effort: "medium", format: betaZodOutputFormat(ImportResultSchema) },
      // If a safety classifier declines, the API retries on a suitable fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    if (response.stop_reason === "refusal") {
      return json(422, { error: "That couldn't be read. Try a different screenshot or paste the email text." });
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return json(502, { error: "Reading that didn't finish. Try fewer pages at a time." });
    }
    return json(200, response.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return json(503, { error: "Import isn't set up yet: the API key is missing or invalid." });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return json(429, { error: "Too many imports right now. Try again in a minute." });
    }
    if (error instanceof Anthropic.BadRequestError) {
      return json(400, { error: "That file couldn't be read. Try a screenshot or paste the text instead." });
    }
    if (error instanceof Anthropic.APIError) {
      return json(502, { error: "Reading failed. Try again in a moment." });
    }
    console.error("import failed", error);
    return json(500, { error: "Reading failed. Try again in a moment." });
  }
}
