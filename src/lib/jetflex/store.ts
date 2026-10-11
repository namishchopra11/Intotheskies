"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { DEFAULT_CABIN, type CabinProfile } from "./cabin";
import { METROS } from "./data";
import { deriveLegs, type Overrides } from "./inventory";
import { defaultRequest, PRESETS } from "./search";
import type { EmptyLeg, ImportedInventory, Itinerary, LegStatus, SchedFlight, TripRequest } from "./types";

export type SavedTrip = { id: string; savedAt: string; request: TripRequest; itinerary: Itinerary; savings: number; timeSaved: number };

type State = {
  request: TripRequest | null;
  active: Itinerary | null; // the itinerary being inspected / protected
  saved: SavedTrip[];
  history: { id: string; text: string; at: string }[];
  cabin: CabinProfile;
  ops: Overrides;
  customFlights: SchedFlight[];
  imported: ImportedInventory | null; // accepted rows from an operator CSV import (null = none)
  setRequest: (r: TripRequest) => void;
  setActive: (i: Itinerary | null) => void;
  save: (i: Itinerary, r: TripRequest, m: { savings: number; timeSaved: number }) => void;
  unsave: (id: string) => void;
  replaceSaved: (id: string, i: Itinerary) => void;
  addHistory: (text: string) => void;
  setCabin: (c: CabinProfile) => void;
  patchLeg: (id: string, p: { price?: number; status?: LegStatus; published?: boolean }) => void;
  addFlight: (f: SchedFlight) => void;
  removeFlight: (id: string) => void;
  setImported: (inv: ImportedInventory | null) => void;
  clearImported: () => void;
  resetDemo: () => void;
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
/** Accepts only a well-formed imported inventory; anything else (including state saved before imports existed) becomes null. */
export function sanitizeImported(v: unknown): ImportedInventory | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (![o.fleet, o.schedule, o.offered, o.rows].every(Array.isArray)) return null;
  const inv = o as unknown as ImportedInventory;
  const ok = inv.fleet.every((a) => a && typeof a.id === "string" && typeof a.type === "string")
    && inv.schedule.every((f) => f && typeof f.id === "string" && typeof f.aircraft === "string" && typeof f.from === "string" && typeof f.to === "string" && typeof f.dep === "string")
    && inv.offered.every((r) => r && typeof r.aircraftId === "string" && typeof r.from === "string" && typeof r.to === "string" && Number.isFinite(r.dep) && Number.isFinite(r.arr));
  return ok ? inv : null;
}

const noop: StateStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// ---- reading saved state defensively -------------------------------------------------------------------
// localStorage is outside our control: another version of the app, a hand edit or a cut-off write can leave
// anything in it. Whatever does not look right is dropped, so a page never crashes on `saved.map` and the
// store always finishes hydrating.
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^\d{2}:\d{2}$/;
const KINDS = ["first_class", "charter", "empty_leg", "hybrid"];
const FLEX = [0, 2, 6, 12, 24];
const LEG_STATUS: LegStatus[] = ["available", "limited", "unavailable"];

export function sanitizeRequest(v: unknown): TripRequest | null {
  if (!isObj(v)) return null;
  const w = v.weights;
  const ok = isStr(v.from) && v.from in METROS && isStr(v.to) && v.to in METROS
    && isStr(v.departDate) && DATE.test(v.departDate) && (v.returnDate === undefined || (isStr(v.returnDate) && DATE.test(v.returnDate)))
    && isNum(v.pax) && Number.isInteger(v.pax) && v.pax >= 1 && v.pax <= 30
    && isNum(v.flexH) && FLEX.includes(v.flexH)
    && isStr(v.departTime) && CLOCK.test(v.departTime) && isStr(v.returnTime) && CLOCK.test(v.returnTime)
    && (v.arriveBy === undefined || (isStr(v.arriveBy) && CLOCK.test(v.arriveBy)))
    && (v.budget === undefined || isNum(v.budget))
    && isStr(v.preset) && v.preset in PRESETS
    && isObj(w) && ["cost", "speed", "control", "privacy", "certainty"].every((k) => isNum(w[k]));
  return ok ? (v as unknown as TripRequest) : null;
}

export function sanitizeItinerary(v: unknown): Itinerary | null {
  if (!isObj(v)) return null;
  const ok = isStr(v.id) && isStr(v.name) && isStr(v.kind) && KINDS.includes(v.kind)
    && isNum(v.pax) && isNum(v.totalPrice) && isNum(v.perPerson) && isNum(v.door2doorMin) && isNum(v.risk) && isNum(v.score)
    && [v.tags, v.parts, v.issues, v.explanation, v.tradeoffs].every(Array.isArray)
    && Array.isArray(v.journeys) && v.journeys.length > 0
    && v.journeys.every((j) => isObj(j) && Array.isArray(j.segments) && j.segments.length > 0
      && j.segments.every((s) => isObj(s) && isStr(s.id) && isStr(s.mode) && isStr(s.from) && isStr(s.to) && isNum(s.dep) && isNum(s.arr) && isNum(s.cost)));
  return ok ? (v as unknown as Itinerary) : null;
}

function sanitizeCabin(v: unknown): CabinProfile {
  const out: Record<string, unknown> = { ...DEFAULT_CABIN };
  if (!isObj(v)) return out as CabinProfile;
  const ENUM: Record<string, string[]> = { workspace: ["quiet", "collab", "relax"], lighting: ["bright", "dim", "dark"], seating: ["club", "forward", "divan", "any"], wifi: ["none", "nice", "required"] };
  for (const [k, d] of Object.entries(DEFAULT_CABIN)) {
    const x = v[k];
    if (Array.isArray(d)) { if (Array.isArray(x) && x.every(isStr)) out[k] = x; }
    else if (typeof d === "number") { if (isNum(x)) out[k] = x; }
    else if (typeof d === "boolean") { if (typeof x === "boolean") out[k] = x; }
    else if (isStr(x) && (!ENUM[k] || ENUM[k].includes(x))) out[k] = x;
  }
  return out as CabinProfile;
}

function sanitizeOps(v: unknown): Overrides {
  const out: Overrides = {};
  if (!isObj(v)) return out;
  for (const [id, p] of Object.entries(v)) {
    if (!isObj(p)) continue;
    const o: { price?: number; status?: LegStatus; published?: boolean } = {};
    if (isNum(p.price)) o.price = p.price;
    if (isStr(p.status) && LEG_STATUS.includes(p.status as LegStatus)) o.status = p.status as LegStatus;
    if (typeof p.published === "boolean") o.published = p.published;
    out[id] = o;
  }
  return out;
}

/** The persisted fields of State, each checked; anything unreadable falls back to its empty value. */
export function sanitizePersisted(v: unknown) {
  const o = isObj(v) ? v : {};
  const saved: SavedTrip[] = [];
  if (Array.isArray(o.saved)) {
    for (const s of o.saved) {
      if (!isObj(s)) continue;
      const request = sanitizeRequest(s.request);
      const itinerary = sanitizeItinerary(s.itinerary);
      if (isStr(s.id) && isStr(s.savedAt) && request && itinerary) saved.push({ id: s.id, savedAt: s.savedAt, request, itinerary, savings: isNum(s.savings) ? s.savings : 0, timeSaved: isNum(s.timeSaved) ? s.timeSaved : 0 });
    }
  }
  const history = Array.isArray(o.history)
    ? o.history.filter((h): h is { id: string; text: string; at: string } => isObj(h) && isStr(h.id) && isStr(h.text) && isStr(h.at)).slice(0, 8)
    : [];
  const customFlights = Array.isArray(o.customFlights)
    ? o.customFlights.filter((f): f is SchedFlight => isObj(f) && isStr(f.id) && isStr(f.aircraft) && isStr(f.from) && isStr(f.to) && isStr(f.dep) && (f.date === undefined || isStr(f.date)))
    : [];
  return {
    request: sanitizeRequest(o.request),
    active: sanitizeItinerary(o.active),
    saved,
    history,
    cabin: sanitizeCabin(o.cabin),
    ops: sanitizeOps(o.ops),
    customFlights,
    imported: sanitizeImported(o.imported),
  };
}

/**
 * localStorage that never throws and never hands back text that is not JSON. Blocked storage, a full disk
 * or a corrupted entry all behave like "nothing saved yet"; without this a bad entry left the store
 * un-hydrated and every screen on its loading skeleton.
 */
export function safeLocalStorage(get: () => Storage | undefined = () => (typeof window === "undefined" ? undefined : window.localStorage)): StateStorage {
  const store = () => { try { return get(); } catch { return undefined; } };
  if (typeof window === "undefined" && store() === undefined) return noop;
  return {
    getItem: (name) => {
      try {
        const raw = store()?.getItem(name) ?? null;
        if (raw !== null) JSON.parse(raw);
        return raw;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => { try { store()?.setItem(name, value); } catch { /* full or blocked: keep working in memory */ } },
    removeItem: (name) => { try { store()?.removeItem(name); } catch { /* ignore */ } },
  };
}

export const useJet = create<State>()(
  persist(
    (set) => ({
      request: null, active: null, saved: [], history: [], cabin: DEFAULT_CABIN, ops: {}, customFlights: [], imported: null,
      setRequest: (request) => set({ request }),
      setActive: (active) => set({ active }),
      save: (itinerary, request, m) => set((s) => ({ saved: [{ id: uid(), savedAt: new Date().toISOString(), request, itinerary, ...m }, ...s.saved.filter((x) => x.itinerary.id !== itinerary.id)] })),
      replaceSaved: (id, itinerary) => set((s) => ({ saved: s.saved.map((x) => (x.id === id ? { ...x, itinerary } : x)) })),
      unsave: (id) => set((s) => ({ saved: s.saved.filter((x) => x.id !== id) })),
      addHistory: (text) => set((s) => ({ history: [{ id: uid(), text, at: new Date().toISOString() }, ...s.history.filter((h) => h.text !== text)].slice(0, 8) })),
      setCabin: (cabin) => set({ cabin }),
      patchLeg: (id, p) => set((s) => ({ ops: { ...s.ops, [id]: { ...s.ops[id], ...p } } })),
      addFlight: (f) => set((s) => ({ customFlights: [...s.customFlights, f] })),
      removeFlight: (id) => set((s) => ({ customFlights: s.customFlights.filter((f) => f.id !== id) })),
      setImported: (imported) => set({ imported: sanitizeImported(imported) }),
      clearImported: () => set({ imported: null }),
      resetDemo: () => set({ request: null, active: null, ops: {}, customFlights: [], imported: null }),
    }),
    {
      name: "jetflex-v1",
      storage: createJSONStorage(() => safeLocalStorage()),
      partialize: (s) => ({ request: s.request, active: s.active, saved: s.saved, history: s.history, cabin: s.cabin, ops: s.ops, customFlights: s.customFlights, imported: s.imported }),
      // State saved before imports existed has no `imported`; a damaged one is dropped rather than crashing search.
      merge: (persisted, current) => ({ ...current, ...sanitizePersisted(persisted) }),
      skipHydration: true,
    },
  ),
);

let started = false;
const sub = (cb: () => void) => useJet.persist.onFinishHydration(cb);
/** False until localStorage has been read, so server and first client render agree. */
export function useJetReady() {
  useEffect(() => {
    if (started) return;
    started = true;
    void useJet.persist.rehydrate();
  }, []);
  return useSyncExternalStore(sub, () => useJet.persist.hasHydrated(), () => false);
}

export const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Everything derived from shared state: today's date, the request in use and the live empty-leg inventory. */
export function useWorld() {
  const ready = useJetReady();
  const ops = useJet((s) => s.ops);
  const custom = useJet((s) => s.customFlights);
  const imported = useJet((s) => s.imported);
  const stored = useJet((s) => s.request);
  const today = useMemo(() => (ready ? localToday() : "2026-01-01"), [ready]);
  const legs: EmptyLeg[] = useMemo(() => (ready ? deriveLegs(today, ops, custom, imported) : []), [ready, today, ops, custom, imported]);
  const request = useMemo(() => stored ?? defaultRequest(today), [stored, today]);
  return { ready, today, legs, request, hasRequest: Boolean(stored), imported };
}
