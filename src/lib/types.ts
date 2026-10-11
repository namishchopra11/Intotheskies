import { z } from "zod";
import { SolanaAddressSchema } from "@/lib/solana/address";

// All times are local wall-clock strings with no timezone, e.g. "2026-10-17T10:35".
// Only ever compare two times that are at the same airport or in the same city.
// Use the helpers in src/lib/domain/time.ts instead of `new Date(...)`.
export const LocalDateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Expected "YYYY-MM-DDTHH:mm"');
export type LocalDateTime = z.infer<typeof LocalDateTimeSchema>;

export const ClockTimeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Expected "HH:mm"');

export const FlightStatusSchema = z.enum(["scheduled", "delayed", "cancelled", "rebooked"]);
export type FlightStatus = z.infer<typeof FlightStatusSchema>;

// The flight as it was before the first revision. Set once, never overwritten.
export const FlightOriginalSchema = z.object({
  airline: z.string(),
  flightNumber: z.string(),
  departAt: LocalDateTimeSchema,
  arriveAt: LocalDateTimeSchema,
});
export type FlightOriginal = z.infer<typeof FlightOriginalSchema>;

export const FlightSchema = z.object({
  id: z.string(),
  airline: z.string(),
  flightNumber: z.string(),
  from: z.string(), // airport code
  to: z.string(), // airport code
  departAt: LocalDateTimeSchema, // local time at `from`
  arriveAt: LocalDateTimeSchema, // local time at `to`
  bookingRef: z.string(),
  seat: z.string().optional(),
  status: FlightStatusSchema,
  original: FlightOriginalSchema.optional(),
});
export type Flight = z.infer<typeof FlightSchema>;

export const StaySchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  phone: z.string().optional(),
  checkIn: LocalDateTimeSchema,
  checkOut: LocalDateTimeSchema,
  confirmation: z.string(),
  latestCheckIn: ClockTimeSchema.optional(), // "HH:mm" on the check-in date
});
export type Stay = z.infer<typeof StaySchema>;

// A booked ride, e.g. an airport pickup or a transfer to the hotel. `pickupAt` is local time
// where the ride starts.
export const RideSchema = z.object({
  id: z.string(),
  provider: z.string(), // "Uber", "Hotel shuttle", a driver's name
  pickupAt: LocalDateTimeSchema,
  from: z.string(), // a place, or an airport code
  to: z.string(),
  phone: z.string().optional(),
  confirmation: z.string().optional(),
  notes: z.string().optional(),
  // The pickup time as booked, kept the first time Layover moves the ride.
  rescheduledFrom: LocalDateTimeSchema.optional(),
});
export type Ride = z.infer<typeof RideSchema>;

export const ContactKindSchema = z.enum(["airline", "hotel", "insurance", "other"]);
export type ContactKind = z.infer<typeof ContactKindSchema>;

export const ContactSchema = z.object({
  id: z.string(),
  kind: ContactKindSchema,
  name: z.string(),
  phone: z.string().optional(),
  url: z.string().optional(),
  notes: z.string().optional(),
});
export type Contact = z.infer<typeof ContactSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string().optional(),
  done: z.boolean(),
  contactId: z.string().optional(),
  source: z.enum(["generated", "custom"]),
});
export type Task = z.infer<typeof TaskSchema>;

export const DisruptionTypeSchema = z.enum([
  "delay",
  "cancellation",
  "missed_connection",
  "rebooked",
]);
export type DisruptionType = z.infer<typeof DisruptionTypeSchema>;

// Something Layover did on its own when the flight changed: tracked the new flight, told the
// hotel, moved a pickup. "pending" means it is waiting on something (e.g. a new arrival time).
export const AutoActionSchema = z.object({
  id: z.string(),
  kind: z.enum(["flight", "hotel", "ride"]),
  status: z.enum(["done", "pending"]),
  title: z.string(),
  detail: z.string().optional(),
  targetId: z.string().optional(), // the flight, stay or ride it was about
});
export type AutoAction = z.infer<typeof AutoActionSchema>;

export const DisruptionSchema = z.object({
  id: z.string(),
  type: DisruptionTypeSchema,
  flightId: z.string(),
  createdAt: z.string(), // ISO timestamp of when it was reported (not a trip time)
  tasks: z.array(TaskSchema),
  actions: z.array(AutoActionSchema).optional(), // optional so older saved trips still load
  notes: z.string().optional(),
});
export type Disruption = z.infer<typeof DisruptionSchema>;

// Who is signed in on this phone. A demo sign-in: there is no server, and the password is
// never stored. `guest` is someone who skipped signing in.
export const ProfileSchema = z.object({
  name: z.string(),
  email: z.string(),
  guest: z.boolean(),
});
export type Profile = z.infer<typeof ProfileSchema>;

// The ElevenLabs voices "Listen to summary" can use (ids and labels: components/trip/speechVoices.ts).
export const SpeechVoiceSchema = z.enum(["george", "sarah", "alice", "roger"]);

// What Layover may do on its own when a flight changes (see lib/domain/autoUpdates.ts),
// plus the traveler's preferences.
export const SettingsSchema = z.object({
  notifyHotel: z.boolean(),
  moveRides: z.boolean(),
  // Alert the traveler when a flight changes (banner, buzz and phone notification).
  notifications: z.boolean(),
  voice: SpeechVoiceSchema,
  // The "Next" button for presenting the app; while it's on, the flight changes only when
  // the presenter asks (see components/trip/DemoNextButton.tsx).
  demoControls: z.boolean(),
});
export type Settings = z.infer<typeof SettingsSchema>;
export const DEFAULT_SETTINGS: Settings = {
  notifyHotel: true,
  moveRides: true,
  notifications: true,
  voice: "george",
  demoControls: true,
};

export const TripSchema = z.object({
  id: z.string(),
  name: z.string(),
  travelerName: z.string(),
  flights: z.array(FlightSchema),
  stays: z.array(StaySchema),
  rides: z.array(RideSchema).optional(), // optional so trips saved before rides existed still load
  contacts: z.array(ContactSchema),
  disruptions: z.array(DisruptionSchema),
  // Keys of the "Before you go" reminders the traveler has ticked off (see components/trip/prep.ts).
  prepDone: z.array(z.string()).optional(),
  // Where a "request funds" link asks contacts to send USDC. Set it with the store's
  // setPayoutAddress, which rejects anything that is not a Solana public key. A stored
  // value that fails validation is dropped on load rather than discarding the trip.
  payoutAddress: SolanaAddressSchema.optional().catch(undefined),
});
export type Trip = z.infer<typeof TripSchema>;
