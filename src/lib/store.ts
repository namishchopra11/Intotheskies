"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { generateChecklist } from "@/lib/domain/checklist";
import { computeImpact } from "@/lib/domain/impact";
import { newId } from "@/lib/id";
import { normalizeSolanaAddress } from "@/lib/solana/address";
import { sampleTrip } from "@/lib/sampleTrip";
import {
  TripSchema,
  type Contact,
  type Disruption,
  type DisruptionType,
  type Flight,
  type FlightStatus,
  type LocalDateTime,
  type Stay,
  type Trip,
} from "@/lib/types";

export type FlightRevision = {
  airline?: string;
  flightNumber?: string;
  departAt?: LocalDateTime;
  arriveAt?: LocalDateTime;
};

export type TripState = {
  trip: Trip | null;

  loadSampleTrip: () => void;
  /** Replaces the current trip with one the traveler entered. */
  startTrip: (trip: Trip) => void;
  resetTrip: () => void;

  upsertFlight: (flight: Flight) => void;
  removeFlight: (flightId: string) => void;
  upsertStay: (stay: Stay) => void;
  removeStay: (stayId: string) => void;
  upsertContact: (contact: Contact) => void;
  removeContact: (contactId: string) => void;

  /**
   * Sets where "request funds" links ask contacts to send USDC. Trims the input; ""
   * clears it. Returns false, and changes nothing, if it is not a Solana public key.
   */
  setPayoutAddress: (address: string) => boolean;

  /**
   * Records what changed on a flight, updates the flight, generates the checklist
   * and returns the new disruption id. Throws if there is no trip or the flight is unknown.
   */
  reportDisruption: (flightId: string, type: DisruptionType, revised?: FlightRevision) => string;

  toggleTask: (disruptionId: string, taskId: string) => void;
  /** Adds a custom task and returns its id ("" if the disruption is unknown). */
  addTask: (disruptionId: string, title: string, detail?: string) => string;
  removeTask: (disruptionId: string, taskId: string) => void;
};

function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((i) => i.id === item.id)
    ? items.map((i) => (i.id === item.id ? item : i))
    : [...items, item];
}

function statusFor(type: DisruptionType, revised: FlightRevision | undefined): FlightStatus {
  if (type === "delay") return "delayed";
  if (type === "rebooked") return "rebooked";
  // A cancelled or missed flight with replacement times has effectively been rebooked.
  return revised?.departAt || revised?.arriveAt ? "rebooked" : "cancelled";
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => {
      const updateTrip = (fn: (trip: Trip) => Trip) =>
        set((state) => (state.trip ? { trip: fn(state.trip) } : state));
      const updateDisruption = (disruptionId: string, fn: (d: Disruption) => Disruption) =>
        updateTrip((trip) => ({
          ...trip,
          disruptions: trip.disruptions.map((d) => (d.id === disruptionId ? fn(d) : d)),
        }));

      return {
        trip: null,

        loadSampleTrip: () => set({ trip: structuredClone(sampleTrip) }),
        startTrip: (trip) => set({ trip }),
        resetTrip: () => set({ trip: null }),

        upsertFlight: (flight) =>
          updateTrip((trip) => ({ ...trip, flights: upsert(trip.flights, flight) })),
        removeFlight: (flightId) =>
          updateTrip((trip) => ({
            ...trip,
            flights: trip.flights.filter((f) => f.id !== flightId),
            disruptions: trip.disruptions.filter((d) => d.flightId !== flightId),
          })),
        upsertStay: (stay) => updateTrip((trip) => ({ ...trip, stays: upsert(trip.stays, stay) })),
        removeStay: (stayId) =>
          updateTrip((trip) => ({ ...trip, stays: trip.stays.filter((s) => s.id !== stayId) })),
        upsertContact: (contact) =>
          updateTrip((trip) => ({ ...trip, contacts: upsert(trip.contacts, contact) })),
        removeContact: (contactId) =>
          updateTrip((trip) => ({
            ...trip,
            contacts: trip.contacts.filter((c) => c.id !== contactId),
            disruptions: trip.disruptions.map((d) => ({
              ...d,
              tasks: d.tasks.map((t) =>
                t.contactId === contactId ? { ...t, contactId: undefined } : t,
              ),
            })),
          })),

        setPayoutAddress: (address) => {
          if (!get().trip) return false;
          if (address.trim() === "") {
            updateTrip((trip) => ({ ...trip, payoutAddress: undefined }));
            return true;
          }
          const valid = normalizeSolanaAddress(address);
          if (!valid) return false;
          updateTrip((trip) => ({ ...trip, payoutAddress: valid }));
          return true;
        },

        reportDisruption: (flightId, type, revised) => {
          const trip = get().trip;
          const flight = trip?.flights.find((f) => f.id === flightId);
          if (!trip || !flight) throw new Error(`reportDisruption: unknown flight "${flightId}"`);

          const updatedFlight: Flight = {
            ...flight,
            airline: revised?.airline ?? flight.airline,
            flightNumber: revised?.flightNumber ?? flight.flightNumber,
            departAt: revised?.departAt ?? flight.departAt,
            arriveAt: revised?.arriveAt ?? flight.arriveAt,
            status: statusFor(type, revised),
            original: flight.original ?? {
              airline: flight.airline,
              flightNumber: flight.flightNumber,
              departAt: flight.departAt,
              arriveAt: flight.arriveAt,
            },
          };
          const updatedTrip: Trip = {
            ...trip,
            flights: trip.flights.map((f) => (f.id === flightId ? updatedFlight : f)),
          };

          const disruption: Disruption = {
            id: newId(),
            type,
            flightId,
            createdAt: new Date().toISOString(),
            tasks: [],
          };
          disruption.tasks = generateChecklist(
            updatedTrip,
            disruption,
            computeImpact(updatedTrip, flightId),
          );

          set({ trip: { ...updatedTrip, disruptions: [...updatedTrip.disruptions, disruption] } });
          return disruption.id;
        },

        toggleTask: (disruptionId, taskId) =>
          updateDisruption(disruptionId, (d) => ({
            ...d,
            tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
          })),
        addTask: (disruptionId, title, detail) => {
          if (!get().trip?.disruptions.some((d) => d.id === disruptionId)) return "";
          const id = newId();
          updateDisruption(disruptionId, (d) => ({
            ...d,
            tasks: [
              ...d.tasks,
              { id, title: title.trim(), detail: detail?.trim() || undefined, done: false, source: "custom" },
            ],
          }));
          return id;
        },
        removeTask: (disruptionId, taskId) =>
          updateDisruption(disruptionId, (d) => ({
            ...d,
            tasks: d.tasks.filter((t) => t.id !== taskId),
          })),
      };
    },
    {
      name: "connectionkeeper-trip",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : window.localStorage,
      ),
      partialize: (state) => ({ trip: state.trip }),
      // Hydration is started by useStoreReady() after mount, so the server render and
      // the first client render both see `trip: null` and never mismatch.
      skipHydration: true,
      // Anything in localStorage that no longer matches the schema is discarded.
      merge: (persisted, current) => {
        const parsed = TripSchema.nullable().safeParse((persisted as { trip?: unknown })?.trip);
        return { ...current, trip: parsed.success ? parsed.data : null };
      },
    },
  ),
);

let hydrationStarted = false;
const subscribeToHydration = (onChange: () => void) =>
  useTripStore.persist.onFinishHydration(onChange);

/**
 * True once the persisted trip has been read from localStorage.
 * Call this in any client component that reads the store, and render a
 * loading state until it returns true:
 *
 *   const ready = useStoreReady();
 *   const trip = useTripStore((s) => s.trip);
 *   if (!ready) return <Loading />;
 */
export function useStoreReady(): boolean {
  useEffect(() => {
    if (hydrationStarted) return;
    hydrationStarted = true;
    void useTripStore.persist.rehydrate();
  }, []);
  return useSyncExternalStore(
    subscribeToHydration,
    () => useTripStore.persist.hasHydrated(),
    () => false,
  );
}
