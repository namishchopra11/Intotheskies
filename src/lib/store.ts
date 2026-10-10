"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { planAutoUpdates } from "@/lib/domain/autoUpdates";
import { generateChecklist } from "@/lib/domain/checklist";
import { computeImpact } from "@/lib/domain/impact";
import { newId } from "@/lib/id";
import { normalizeSolanaAddress } from "@/lib/solana/address";
import { sampleTrip } from "@/lib/sampleTrip";
import {
  DEFAULT_SETTINGS,
  ProfileSchema,
  SettingsSchema,
  TripSchema,
  type Profile,
  type Settings,
  type Contact,
  type Disruption,
  type DisruptionType,
  type Flight,
  type FlightStatus,
  type LocalDateTime,
  type Ride,
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
  /** Trips put aside with saveAndCloseTrip, most recent first. */
  savedTrips: Trip[];
  /** Who is signed in on this phone; null = nobody yet (show /login). */
  profile: Profile | null;
  settings: Settings;

  /** Demo sign-in: keeps the name and email on this phone. Never pass a password here. */
  signIn: (profile: Profile) => void;
  /** Signs out. With `erase`, also deletes the trip and saved trips from this phone. */
  signOut: (options?: { erase?: boolean }) => void;
  updateProfile: (changes: Partial<Pick<Profile, "name" | "email">>) => void;
  updateSettings: (changes: Partial<Settings>) => void;

  loadSampleTrip: () => void;
  resetTrip: () => void;
  /** Starts an empty trip (replacing any current one) for the traveler to fill in. */
  startTrip: (details: { name: string; travelerName: string }) => void;
  /** Puts the current trip in savedTrips (replacing an older copy of it) and closes it. */
  saveAndCloseTrip: () => void;
  /** Reopens a saved trip. The current trip, if any, is saved first so nothing is lost. */
  openSavedTrip: (tripId: string) => void;
  removeSavedTrip: (tripId: string) => void;
  /** Renames the trip or the traveler. */
  updateTripDetails: (details: { name?: string; travelerName?: string }) => void;

  upsertFlight: (flight: Flight) => void;
  removeFlight: (flightId: string) => void;
  upsertStay: (stay: Stay) => void;
  removeStay: (stayId: string) => void;
  upsertRide: (ride: Ride) => void;
  removeRide: (rideId: string) => void;
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

      const withSaved = (saved: Trip[], trip: Trip | null) =>
        trip ? [trip, ...saved.filter((t) => t.id !== trip.id)] : saved;

      return {
        trip: null,
        savedTrips: [],
        profile: null,
        settings: DEFAULT_SETTINGS,

        signIn: (profile) =>
          set({ profile: { name: profile.name.trim(), email: profile.email.trim(), guest: profile.guest } }),
        signOut: ({ erase = false } = {}) =>
          set(erase ? { profile: null, trip: null, savedTrips: [], settings: DEFAULT_SETTINGS } : { profile: null }),
        updateProfile: (changes) =>
          set((state) =>
            state.profile
              ? { profile: { ...state.profile, ...changes, guest: false } }
              : state,
          ),
        updateSettings: (changes) => set((state) => ({ settings: { ...state.settings, ...changes } })),

        loadSampleTrip: () => set({ trip: structuredClone(sampleTrip) }),
        resetTrip: () => set({ trip: null }),
        startTrip: ({ name, travelerName }) =>
          set({
            trip: {
              id: newId(),
              name: name.trim(),
              travelerName: travelerName.trim(),
              flights: [],
              stays: [],
              rides: [],
              contacts: [],
              disruptions: [],
            },
          }),
        saveAndCloseTrip: () =>
          set((state) => ({ trip: null, savedTrips: withSaved(state.savedTrips, state.trip) })),
        openSavedTrip: (tripId) =>
          set((state) => {
            const saved = state.savedTrips.find((t) => t.id === tripId);
            if (!saved) return state;
            const rest = withSaved(state.savedTrips, state.trip).filter((t) => t.id !== tripId);
            return { trip: saved, savedTrips: rest };
          }),
        removeSavedTrip: (tripId) =>
          set((state) => ({ savedTrips: state.savedTrips.filter((t) => t.id !== tripId) })),
        updateTripDetails: ({ name, travelerName }) =>
          updateTrip((trip) => ({
            ...trip,
            name: name?.trim() ?? trip.name,
            travelerName: travelerName?.trim() ?? trip.travelerName,
          })),

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
        upsertRide: (ride) =>
          updateTrip((trip) => ({ ...trip, rides: upsert(trip.rides ?? [], ride) })),
        removeRide: (rideId) =>
          updateTrip((trip) => ({ ...trip, rides: (trip.rides ?? []).filter((r) => r.id !== rideId) })),
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
          const withFlight: Trip = {
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
          // What Layover handles by itself (hotel, pickups) happens first, so the checklist
          // only lists what is left for the traveler.
          const plan = planAutoUpdates(withFlight, flightId, disruption.id, get().settings);
          disruption.actions = plan.actions;
          const updatedTrip: Trip = {
            ...withFlight,
            rides: (withFlight.rides ?? []).map((r) => plan.rides.find((m) => m.id === r.id) ?? r),
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
      partialize: (state) => ({
        trip: state.trip,
        savedTrips: state.savedTrips,
        profile: state.profile,
        settings: state.settings,
      }),
      // Hydration is started by useStoreReady() after mount, so the server render and
      // the first client render both see `trip: null` and never mismatch.
      skipHydration: true,
      // Anything in localStorage that no longer matches the schema is discarded.
      merge: (persisted, current) => {
        const p = persisted as
          | { trip?: unknown; savedTrips?: unknown; profile?: unknown; settings?: unknown }
          | undefined;
        const profile = ProfileSchema.safeParse(p?.profile);
        const settings = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...(p?.settings as object) });
        const parsed = TripSchema.nullable().safeParse(p?.trip);
        const saved = Array.isArray(p?.savedTrips) ? p.savedTrips : [];
        const savedTrips = saved.flatMap((t) => {
          const r = TripSchema.safeParse(t);
          return r.success ? [r.data] : [];
        });
        return {
          ...current,
          trip: parsed.success ? parsed.data : null,
          savedTrips,
          profile: profile.success ? profile.data : null,
          settings: settings.success ? settings.data : DEFAULT_SETTINGS,
        };
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
