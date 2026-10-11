"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { generateChecklist } from "@/lib/domain/checklist";
import { computeImpact } from "@/lib/domain/impact";
import { newId } from "@/lib/id";
import { normalizeSolanaAddress } from "@/lib/solana/address";
import { migratePersisted, recoverTrip, type LoadNotice } from "@/lib/recoverTrip";
import { sampleTrip } from "@/lib/sampleTrip";
import {
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

const STORAGE_KEY = "connectionkeeper-trip";

export type TripState = {
  trip: Trip | null;
  /** Set when a saved trip was only partly readable, or not at all. Not persisted. */
  loadNotice: LoadNotice | null;
  dismissLoadNotice: () => void;

  loadSampleTrip: () => void;
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
   * Reporting the same change again (same type, nothing new to apply) while the earlier
   * one still has unfinished tasks is a no-op that returns the existing disruption's id.
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
        loadNotice: null,
        dismissLoadNotice: () => set({ loadNotice: null }),

        loadSampleTrip: () =>
          set((state) => ({
            trip: { ...structuredClone(sampleTrip), payoutAddress: state.trip?.payoutAddress },
            loadNotice: null,
          })),
        resetTrip: () => set({ trip: null, loadNotice: null }),

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
          const repeat = trip.disruptions.find(
            (d) => d.flightId === flightId && d.type === type && d.tasks.some((t) => !t.done),
          );
          const unchanged =
            updatedFlight.status === flight.status &&
            updatedFlight.airline === flight.airline &&
            updatedFlight.flightNumber === flight.flightNumber &&
            updatedFlight.departAt === flight.departAt &&
            updatedFlight.arriveAt === flight.arriveAt;
          if (repeat && unchanged) return repeat.id;

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
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : window.localStorage,
      ),
      partialize: (state) => ({ trip: state.trip }),
      // Hydration is started by useStoreReady() after mount, so the server render and
      // the first client render both see `trip: null` and never mismatch.
      skipHydration: true,
      migrate: (persisted) => migratePersisted(persisted),
      // A saved trip that no longer matches the schema is rebuilt from the parts that do,
      // and the screens are told (loadNotice) rather than silently showing "no trip".
      merge: (persisted, current) => {
        const { trip, notice } = recoverTrip((persisted as { trip?: unknown } | undefined)?.trip);
        // Keep a notice the traveler has not dismissed when another tab's save is read back.
        return { ...current, trip, loadNotice: notice ?? current.loadNotice };
      },
    },
  ),
);

let hydrationStarted = false;

// Another tab changed the saved trip: read it back, so this tab does not overwrite it later.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (hydrationStarted && (e.key === null || e.key === STORAGE_KEY)) {
      void useTripStore.persist.rehydrate();
    }
  });
}

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
