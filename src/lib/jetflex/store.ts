"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_CABIN, type CabinProfile } from "./cabin";
import { deriveLegs, type Overrides } from "./inventory";
import { defaultRequest } from "./search";
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

const noop = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

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
      storage: createJSONStorage(() => (typeof window === "undefined" ? noop : window.localStorage)),
      partialize: (s) => ({ request: s.request, active: s.active, saved: s.saved, history: s.history, cabin: s.cabin, ops: s.ops, customFlights: s.customFlights, imported: s.imported }),
      // State saved before imports existed has no `imported`; a damaged one is dropped rather than crashing search.
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<State>), imported: sanitizeImported((persisted as { imported?: unknown } | null)?.imported) }),
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
