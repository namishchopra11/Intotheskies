"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { planAutoUpdates } from "@/lib/domain/autoUpdates";
import { generateChecklist } from "@/lib/domain/checklist";
import { computeImpact } from "@/lib/domain/impact";
import { newId } from "@/lib/id";
import { normalizeSolanaAddress } from "@/lib/solana/address";
import { migratePersisted, recoverTrip, type LoadNotice } from "@/lib/recoverTrip";
import { safeStorage } from "@/lib/safeStorage";
import { useFeedback } from "@/lib/feedback";
import { sampleTrip } from "@/lib/sampleTrip";
import {
  DEFAULT_SETTINGS,
  ProfileSchema,
  SettingsSchema,
  type Profile,
  type Settings,
  type Contact,
  type Disruption,
  type DisruptionType,
  type Flight,
  type FlightStatus,
  type LocalDateTime,
  type Person,
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

const STORAGE_KEY = "connectionkeeper-trip";

export type TripState = {
  trip: Trip | null;
  /** Set when a saved trip was only partly readable, or not at all. Not persisted. */
  loadNotice: LoadNotice | null;
  dismissLoadNotice: () => void;
  /** Trips put aside with saveAndCloseTrip, most recent first. */
  savedTrips: Trip[];
  /** Who is signed in on this phone; null = nobody yet (show /login). */
  profile: Profile | null;
  settings: Settings;
  /**
   * Trips put away for signed-in accounts that are logged out, keyed by accountKey(). Each
   * account gets its own back when it signs in again. Guests have no entry: their trip is
   * deleted when they log out.
   */
  accounts: Record<string, { trip: Trip | null; savedTrips: Trip[]; name?: string }>;

  /**
   * Demo sign-in: keeps the name and email on this phone. Never pass a password here.
   * Brings back that account's trips if it signed in here before; otherwise whatever is open
   * stays open (so a guest who creates an account keeps their trip).
   */
  signIn: (profile: Profile) => void;
  /**
   * Logs out and clears the screen: a signed-in account's trips are put away for its next
   * sign-in, a guest's are deleted. With `erase`, this account's trips and the settings go too.
   */
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
  /** Keeps a finished trip in the archive, including all its bookings and tasks. */
  archiveTrip: (tripId: string) => void;
  /** Renames the trip or the traveler. */
  updateTripDetails: (details: { name?: string; travelerName?: string }) => void;

  upsertFlight: (flight: Flight) => void;
  removeFlight: (flightId: string) => void;
  upsertStay: (stay: Stay) => void;
  removeStay: (stayId: string) => void;
  upsertRide: (ride: Ride) => void;
  removeRide: (rideId: string) => void;
  /** Someone waiting on the traveler (a driver, a relative); each one gets a draft message. */
  upsertPerson: (person: Person) => void;
  removePerson: (personId: string) => void;
  /** Ticks or unticks a "Before you go" reminder by its key. */
  togglePrep: (key: string) => void;
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

/** Who owns a set of trips on this phone: provider and email. Guests own none to keep. */
export function accountKey(profile: Profile): string | null {
  if (profile.guest || !profile.email.trim()) return null;
  return `${profile.provider ?? "email"}:${profile.email.trim().toLowerCase()}`;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => {
      const updateTrip = (fn: (trip: Trip) => Trip, undoLabel?: string) => {
        const before = get().trip;
        if (!before) return;
        const after = fn(before);
        set({ trip: after });
        if (undoLabel) useFeedback.getState().offerUndo(undoLabel, () => {
          // Never restore an old snapshot over subsequent edits or a different trip.
          if (get().trip !== after) return false;
          set({ trip: before });
          return true;
        });
      };
      const updateDisruption = (disruptionId: string, fn: (d: Disruption) => Disruption, undoLabel?: string) =>
        updateTrip((trip) => ({
          ...trip,
          disruptions: trip.disruptions.map((d) => (d.id === disruptionId ? fn(d) : d)),
        }), undoLabel);

      const withSaved = (saved: Trip[], trip: Trip | null) =>
        trip ? [trip, ...saved.filter((t) => t.id !== trip.id)] : saved;

      return {
        trip: null,
        loadNotice: null,
        dismissLoadNotice: () => set({ loadNotice: null }),
        savedTrips: [],
        profile: null,
        settings: DEFAULT_SETTINGS,
        accounts: {},

        signIn: (profile) =>
          set((state) => {
            const next: Profile = {
              name: profile.name.trim(),
              email: profile.email.trim(),
              guest: profile.guest,
              ...(profile.provider ? { provider: profile.provider } : {}),
            };
            const key = accountKey(next);
            const stash = key ? state.accounts[key] : undefined;
            if (!key || !stash) return { profile: next };
            const accounts = { ...state.accounts };
            delete accounts[key];
            return { profile: next, trip: stash.trip, savedTrips: stash.savedTrips, accounts, loadNotice: null };
          }),
        signOut: ({ erase = false } = {}) =>
          set((state) => {
            const key = state.profile ? accountKey(state.profile) : null;
            const accounts = { ...state.accounts };
            if (key) {
              if (erase) delete accounts[key];
              // The name too, so logging back in with just the email still greets them by it.
              else accounts[key] = { trip: state.trip, savedTrips: state.savedTrips, name: state.profile?.name };
            }
            return {
              profile: null,
              trip: null,
              savedTrips: [],
              accounts,
              loadNotice: null,
              ...(erase ? { settings: DEFAULT_SETTINGS } : {}),
            };
          }),
        updateProfile: (changes) =>
          set((state) =>
            state.profile
              ? { profile: { ...state.profile, ...changes, guest: false } }
              : state,
          ),
        updateSettings: (changes) => set((state) => ({ settings: { ...state.settings, ...changes } })),

        // Restarting the demo keeps a saved Solana address, so a rehearsal does not lose it.
        loadSampleTrip: () =>
          set((state) => ({
            trip: { ...structuredClone(sampleTrip), payoutAddress: state.trip?.payoutAddress },
            loadNotice: null,
          })),
        resetTrip: () => set({ trip: null, loadNotice: null }),
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
            loadNotice: null,
          }),
        saveAndCloseTrip: () =>
          set((state) => ({ trip: null, savedTrips: withSaved(state.savedTrips, state.trip) })),
        openSavedTrip: (tripId) =>
          set((state) => {
            const saved = state.savedTrips.find((t) => t.id === tripId);
            if (!saved) return state;
            const rest = withSaved(state.savedTrips, state.trip).filter((t) => t.id !== tripId);
            return { trip: { ...saved, archivedAt: undefined }, savedTrips: rest };
          }),
        removeSavedTrip: (tripId) => {
          const before = get().savedTrips;
          if (!before.some((t) => t.id === tripId)) return;
          const after = before.filter((t) => t.id !== tripId);
          set({ savedTrips: after });
          useFeedback.getState().offerUndo("Trip deleted", () => {
            if (get().savedTrips !== after) return false;
            set({ savedTrips: before });
            return true;
          });
        },
        archiveTrip: (tripId) => {
          const before = { trip: get().trip, savedTrips: get().savedTrips };
          const selected = before.trip?.id === tripId ? before.trip : before.savedTrips.find((t) => t.id === tripId);
          if (!selected) return;
          const archived = { ...selected, archivedAt: new Date().toISOString() };
          const after = {
            trip: before.trip?.id === tripId ? null : before.trip,
            savedTrips: withSaved(before.savedTrips, archived),
          };
          set(after);
          useFeedback.getState().offerUndo("Trip archived", () => {
            if (get().trip !== after.trip || get().savedTrips !== after.savedTrips) return false;
            set(before);
            return true;
          });
        },
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
          }), "Flight deleted"),
        upsertStay: (stay) => updateTrip((trip) => ({ ...trip, stays: upsert(trip.stays, stay) })),
        removeStay: (stayId) =>
          updateTrip((trip) => ({ ...trip, stays: trip.stays.filter((s) => s.id !== stayId) }), "Hotel deleted"),
        upsertRide: (ride) =>
          updateTrip((trip) => ({ ...trip, rides: upsert(trip.rides ?? [], ride) })),
        togglePrep: (key) =>
          updateTrip((trip) => {
            const done = new Set(trip.prepDone ?? []);
            if (done.has(key)) done.delete(key);
            else done.add(key);
            return { ...trip, prepDone: [...done] };
          }, get().trip?.prepDone?.includes(key) ? undefined : "Reminder completed"),
        removeRide: (rideId) =>
          updateTrip((trip) => ({ ...trip, rides: (trip.rides ?? []).filter((r) => r.id !== rideId) }), "Ride deleted"),
        upsertPerson: (person) =>
          updateTrip((trip) => ({ ...trip, people: upsert(trip.people ?? [], person) })),
        removePerson: (personId) =>
          updateTrip((trip) => ({ ...trip, people: (trip.people ?? []).filter((p) => p.id !== personId) })),
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
          }), get().trip?.disruptions.find((d) => d.id === disruptionId)?.tasks.find((t) => t.id === taskId)?.done ? undefined : "Task completed"),
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
          }), "Task deleted"),
      };
    },
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : safeStorage(() => window.localStorage),
      ),
      partialize: (state) => ({
        trip: state.trip,
        savedTrips: state.savedTrips,
        profile: state.profile,
        settings: state.settings,
        accounts: state.accounts,
      }),
      // Hydration is started by useStoreReady() after mount, so the server render and
      // the first client render both see `trip: null` and never mismatch.
      skipHydration: true,
      migrate: (persisted) => migratePersisted(persisted),
      // A saved trip that no longer matches the schema is rebuilt from the parts that do,
      // and the screens are told (loadNotice) rather than silently showing "no trip".
      merge: (persisted, current) => {
        const p = persisted as
          | { trip?: unknown; savedTrips?: unknown; profile?: unknown; settings?: unknown; accounts?: unknown }
          | undefined;
        const { trip, notice } = recoverTrip(p?.trip);
        const profile = ProfileSchema.safeParse(p?.profile);
        const settings = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...(p?.settings as object) });
        // Saved trips are recovered the same way; one that cannot be read at all is left out.
        const saved = Array.isArray(p?.savedTrips) ? p.savedTrips : [];
        const savedTrips = saved.flatMap((t) => {
          const r = recoverTrip(t).trip;
          return r ? [r] : [];
        });
        // Each logged-out account's trips, read the same forgiving way.
        const accounts: TripState["accounts"] = {};
        const rawAccounts = p?.accounts && typeof p.accounts === "object" ? (p.accounts as Record<string, unknown>) : {};
        for (const [key, value] of Object.entries(rawAccounts)) {
          const v = value as { trip?: unknown; savedTrips?: unknown; name?: unknown } | null;
          accounts[key] = {
            ...(typeof v?.name === "string" && v.name ? { name: v.name } : {}),
            trip: v?.trip ? recoverTrip(v.trip).trip : null,
            savedTrips: (Array.isArray(v?.savedTrips) ? v.savedTrips : []).flatMap((t) => {
              const r = recoverTrip(t).trip;
              return r ? [r] : [];
            }),
          };
        }
        return {
          ...current,
          trip,
          accounts,
          // Keep a notice the traveler has not dismissed when another tab's save is read back.
          loadNotice: notice ?? current.loadNotice,
          savedTrips,
          profile: profile.success ? profile.data : null,
          settings: settings.success ? settings.data : DEFAULT_SETTINGS,
        };
      },
    },
  ),
);

// A newer edit or a trip loaded from another tab invalidates a snapshot undo.
useTripStore.subscribe((next, previous) => {
  if (next.trip !== previous.trip || next.savedTrips !== previous.savedTrips || next.profile !== previous.profile) {
    useFeedback.getState().clearUndo();
  }
});

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
