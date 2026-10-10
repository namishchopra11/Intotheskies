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

export const PersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["pickup", "family", "other"]),
  phone: z.string().optional(),
});
export type Person = z.infer<typeof PersonSchema>;

export const DisruptionTypeSchema = z.enum([
  "delay",
  "cancellation",
  "missed_connection",
  "rebooked",
]);
export type DisruptionType = z.infer<typeof DisruptionTypeSchema>;

export const DisruptionSchema = z.object({
  id: z.string(),
  type: DisruptionTypeSchema,
  flightId: z.string(),
  createdAt: z.string(), // ISO timestamp of when it was reported (not a trip time)
  tasks: z.array(TaskSchema),
  notes: z.string().optional(),
});
export type Disruption = z.infer<typeof DisruptionSchema>;

export const TripSchema = z.object({
  id: z.string(),
  name: z.string(),
  travelerName: z.string(),
  flights: z.array(FlightSchema),
  stays: z.array(StaySchema),
  contacts: z.array(ContactSchema),
  disruptions: z.array(DisruptionSchema),
  // People waiting on the traveler. Optional so trips saved before this existed still load.
  people: z.array(PersonSchema).optional().catch(undefined),
  // Where a "request funds" link asks contacts to send USDC. Set it with the store's
  // setPayoutAddress, which rejects anything that is not a Solana public key. A stored
  // value that fails validation is dropped on load rather than discarding the trip.
  payoutAddress: SolanaAddressSchema.optional().catch(undefined),
});
export type Trip = z.infer<typeof TripSchema>;
