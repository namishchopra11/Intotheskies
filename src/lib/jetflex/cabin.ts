// My Cabin: a saved preference profile and the service brief built from it. The brief is a request
// for an operator to review; JetFlex does not contact operators or arrange anything.
import { AIRCRAFT_TYPES, AIRPORTS } from "./data";
import { fmtDate, fmtTime, usd } from "./time";
import type { Itinerary, Segment } from "./types";

export type CabinProfile = {
  name: string;
  tempF: number;
  diet: string[];
  mealNotes: string;
  hotMeals: boolean;
  drinks: string[];
  drinkNotes: string;
  workspace: "quiet" | "collab" | "relax";
  lighting: "bright" | "dim" | "dark";
  seating: "club" | "forward" | "divan" | "any";
  wifi: "none" | "nice" | "required";
  standUp: boolean;
  bags: number;
  pets: string;
  other: string;
};

export const DEFAULT_CABIN: CabinProfile = {
  name: "", tempF: 71, diet: [], mealNotes: "", hotMeals: false, drinks: ["Sparkling water"], drinkNotes: "", workspace: "relax",
  lighting: "dim", seating: "any", wifi: "nice", standUp: false, bags: 4, pets: "", other: "",
};
export const DIETS = ["Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher", "Nut allergy", "Shellfish allergy", "Dairy-free"];
export const DRINKS = ["Sparkling water", "Still water", "Espresso", "Green tea", "Sparkling wine", "Red wine", "Whisky", "Fresh juice"];

export type Conflict = { level: "warn" | "ask"; text: string };
export type CabinBrief = { text: string; conflicts: Conflict[]; questions: string[]; segments: Segment[]; applicable: boolean };

const LABEL = { quiet: "quiet, focused workspace", collab: "collaborative table seating for working together", relax: "relaxed seating with no work setup" } as const;
const LIGHT = { bright: "bright cabin lighting", dim: "dimmed, warm lighting", dark: "dark cabin for resting" } as const;
const SEAT = { club: "club-style facing seats", forward: "forward-facing seats", divan: "divan or lie-flat seating", any: "no seating preference" } as const;

export function cabinConflicts(p: CabinProfile, seg: Segment): Conflict[] {
  const t = seg.typeId ? AIRCRAFT_TYPES[seg.typeId] : null;
  if (!t) return [];
  const c: Conflict[] = [];
  if (p.wifi === "required" && t.wifi !== "high-speed") c.push({ level: "warn", text: `${t.name}: Wi-Fi is ${t.wifi === "none" ? "not offered" : "basic only"} in this simulated aircraft profile, so reliable video calls may not work.` });
  if (p.hotMeals && t.galley === "cold") c.push({ level: "warn", text: `${t.name} has a cold-service galley in this profile, so hot meals may not be possible.` });
  if (p.seating === "divan" && !t.bed) c.push({ level: "warn", text: `${t.name} may not offer divan or lie-flat seating.` });
  if (p.standUp && !t.standUp) c.push({ level: "warn", text: `${t.name} may not have a stand-up cabin.` });
  if (p.bags > t.bags) c.push({ level: "warn", text: `You listed ${p.bags} bags; the simulated baggage allowance for ${t.name} is about ${t.bags}.` });
  if (p.pets.trim() && !t.pets) c.push({ level: "warn", text: `${t.name} may not accept pets.` });
  return c;
}

export function buildBrief(p: CabinProfile, it: Itinerary): CabinBrief {
  const segments = it.journeys.flatMap((j) => j.segments).filter((s) => s.mode === "charter" || s.mode === "empty_leg");
  if (!segments.length) return { text: "", conflicts: [], questions: [], segments, applicable: false };
  const conflicts = segments.flatMap((s) => cabinConflicts(p, s).map((c) => ({ ...c })));
  const questions = [
    "Please confirm the aircraft, tail number and cabin configuration for each flight.",
    "Can catering meet the dietary requirements and drink requests below, and what is the lead time?",
    `Can the cabin be pre-conditioned to about ${p.tempF}°F, and does that need ground power at the FBO?`,
    p.bags ? `Is baggage for ${p.bags} bag${p.bags > 1 ? "s" : ""} acceptable on each flight?` : "",
    p.pets.trim() ? "What is your pet policy, and are carriers or documents required?" : "",
    segments.some((s) => s.mode === "empty_leg") ? "This is a repositioning flight: please confirm the departure window and how late changes would be communicated." : "",
  ].filter(Boolean);
  const lines: string[] = [
    "CABIN SERVICE BRIEF (request for operator review)",
    "Prepared in JetFlex, a demo. No operator has been contacted, no aircraft prepared, no catering ordered and no crew notified.",
    "",
    `Traveler: ${p.name || "Not provided"}   Party: ${it.pax}`,
    `Itinerary: ${it.name}`,
    ...it.journeys.flatMap((j) =>
      j.segments.filter((s) => s.mode !== "ground").map((s) => `  ${j.dir === "out" ? "Outbound" : "Return"}: ${s.label} · ${fmtDate(localDateOf(s))} ${fmtTime(s.dep, AIRPORTS[s.from].tz)}`),
    ),
    `Simulated price for planning only: ${usd(it.totalPrice)} total (${usd(it.perPerson)} per person).`,
    "",
    "PREFERENCES",
    `  Cabin temperature: ${p.tempF}°F`,
    `  Meals: ${p.diet.length ? p.diet.join(", ") : "No dietary requirements"}${p.hotMeals ? "; hot meal service requested" : ""}${p.mealNotes ? `. ${p.mealNotes}` : ""}`,
    `  Drinks: ${p.drinks.length ? p.drinks.join(", ") : "No preference"}${p.drinkNotes ? `. ${p.drinkNotes}` : ""}`,
    `  Workspace: ${LABEL[p.workspace]}`,
    `  Lighting: ${LIGHT[p.lighting]}`,
    `  Seating: ${SEAT[p.seating]}${p.standUp ? "; stand-up cabin preferred" : ""}`,
    `  Connectivity: ${{ none: "not needed", nice: "nice to have", required: "required (video calls)" }[p.wifi]}`,
    `  Luggage: ${p.bags} bag${p.bags === 1 ? "" : "s"}`,
    p.pets.trim() ? `  Pets: ${p.pets}` : "",
    p.other.trim() ? `  Other requests: ${p.other}` : "",
    "",
    conflicts.length ? "MAY NOT BE SUPPORTED BY THE SELECTED AIRCRAFT" : "",
    ...conflicts.map((c) => `  - ${c.text}`),
    "",
    "QUESTIONS FOR THE OPERATOR",
    ...questions.map((q, i) => `  ${i + 1}. ${q}`),
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
  return { text: lines.join("\n"), conflicts, questions, segments, applicable: true };
}
const localDateOf = (s: Segment) => new Date((s.dep + AIRPORTS[s.from].tz * 60) * 60000).toISOString().slice(0, 10);
