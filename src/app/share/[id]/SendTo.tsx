"use client";

import { useTimeFormat } from "@/lib/useTimeFormat";
import { useState } from "react";
import { Button, Icon, SignArrow, buttonClasses } from "@/components/ui";
import { buildDrafts, sendLink, type Draft } from "@/lib/domain/messages";
import { useTripStore } from "@/lib/store";
import type { Trip } from "@/lib/types";

const ROLE = { pickup: "Pickup", family: "Family", hotel: "Hotel" } as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * One ready-written message per person. How it goes is picked from what's saved for them: a
 * text if there's a phone number, otherwise an email. The button opens Messages or Mail with
 * it filled in (the app can't send by itself) and ticks the matching checklist task. With no
 * details saved, it asks for a number or email, or offers the phone's contacts where the
 * browser allows it.
 */
export function SendTo({ trip, disruptionId }: { trip: Trip; disruptionId: string }) {
  const displayTime = useTimeFormat();
  const toggleTask = useTripStore((s) => s.toggleTask);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const drafts = buildDrafts(trip, disruptionId).map((draft) => ({ ...draft, body: displayTime(draft.body) }));
  if (drafts.length === 0) return null;

  // Read the live store: toggleTask flips the state, so only tick tasks that are still open.
  const tick = (taskIds: string[]) => {
    const tasks = useTripStore.getState().trip?.disruptions.find((d) => d.id === disruptionId)?.tasks ?? [];
    for (const id of taskIds) if (tasks.some((t) => t.id === id && !t.done)) toggleTask(disruptionId, id);
  };

  return (
    <section aria-labelledby="send-to-h" className="ck-rise mx-4">
      <h2 id="send-to-h" className="ck-h2 mb-3">
        Send to
      </h2>
      <div className="flex flex-col gap-[3px]">
        {drafts.map((d) => {
          const link = sendLink(d);
          const sent = opened.has(d.id);
          const to = link?.channel === "text" ? d.phone : d.email;
          return (
            <div key={d.id} className="flex flex-col gap-3 rounded-card bg-surface px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-3">
                  <span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] bg-key font-display text-[22px] font-bold text-on-key">
                    {d.kind === "hotel" ? <Icon name="bed" size={18} /> : d.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[24px] leading-none font-bold">{d.name}</span>
                    <span className="mt-0.5 block text-[14px] font-medium text-ink-2">{ROLE[d.kind]}</span>
                  </span>
                </p>
                {sent && (
                  <span className="ck-fade inline-flex items-center gap-1 text-[14px] font-bold text-ok-fg">
                    <Icon name="check" size={14} strokeWidth={3} /> Opened
                  </span>
                )}
              </div>
              {/* Switching between sending and editing the number or email crossfades. */}
              <div key={link && editing !== d.id ? "send" : "edit"} className="ck-fade flex flex-col gap-2.5">
                {link && editing !== d.id ? (
                  <>
                    <a
                      href={link.href}
                      onClick={() => {
                        tick(d.taskIds);
                        setOpened((o) => new Set(o).add(d.id));
                      }}
                      className={buttonClasses({ variant: sent ? "tinted" : "plate", size: "md", block: true, chip: true })}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon name="message" size={19} strokeWidth={2.25} />
                        {link.channel === "text" ? `Text ${d.name}` : `Email ${d.name}`}
                      </span>
                      <span aria-hidden="true" className={sent ? "inline-flex h-10 w-10 items-center justify-center rounded-[3px] bg-sunk" : "inline-flex h-10 w-10 items-center justify-center rounded-[3px] bg-sign text-on-sign"}>
                        {sent ? <Icon name="check" size={18} strokeWidth={3} /> : <SignArrow size={20} className="ck-key-arrow" />}
                      </span>
                    </a>
                    <p className="flex items-center justify-between gap-2 text-[14px] text-ink-2">
                      <span className="truncate">
                        <span className="font-num">{to}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditing(d.id)}
                        className="ck-press min-h-11 shrink-0 cursor-pointer font-bold text-ink underline underline-offset-4"
                      >
                        Change
                      </button>
                    </p>
                  </>
                ) : (
                  <ContactEditor trip={trip} draft={d} onDone={() => setEditing(null)} canCancel={Boolean(link)} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type PickedContact = { tel?: string[]; email?: string[] };
type ContactsManager = { select: (props: string[], opts: { multiple: boolean }) => Promise<PickedContact[]> };

/** A phone number or email for someone with none saved, typed in or picked from the phone. */
function ContactEditor({ trip, draft, onDone, canCancel }: { trip: Trip; draft: Draft; onDone: () => void; canCancel: boolean }) {
  const upsertPerson = useTripStore((s) => s.upsertPerson);
  const upsertStay = useTripStore((s) => s.upsertStay);
  const hotel = draft.kind === "hotel";
  const [value, setValue] = useState((draft.phone || draft.email) ?? "");
  const [error, setError] = useState<string | null>(null);
  // Only some browsers (Android Chrome) can open the phone's contacts; iPhone browsers can't.
  const contacts =
    typeof navigator !== "undefined" && "contacts" in navigator
      ? (navigator as unknown as { contacts: ContactsManager }).contacts
      : null;

  const save = (raw: string) => {
    const v = raw.trim();
    const isEmail = EMAIL.test(v);
    const isPhone = !isEmail && v.replace(/\D/g, "").length >= 6;
    if (!isEmail && !isPhone) return setError(hotel ? "Enter a phone number." : "Enter a phone number or an email.");
    if (hotel && isEmail) return setError("Hotels need a phone number here.");
    if (hotel) {
      const stay = trip.stays.find((s) => s.id === draft.id);
      if (stay) upsertStay({ ...stay, phone: v });
    } else {
      const person = trip.people?.find((p) => p.id === draft.id);
      if (person) upsertPerson({ ...person, phone: isPhone ? v : undefined, email: isEmail ? v : person.email });
    }
    setError(null);
    onDone();
  };

  const pick = async () => {
    try {
      const [c] = await contacts!.select(hotel ? ["tel"] : ["tel", "email"], { multiple: false });
      const found = c?.tel?.[0] ?? (hotel ? undefined : c?.email?.[0]);
      if (found) save(found);
    } catch {
      // The person closed the picker.
    }
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save(value);
      }}
    >
      <p className="text-[14px] font-medium text-ink-2">
        {canCancel ? `Reach ${draft.name} at:` : `Add ${hotel ? "a phone number" : "a phone or email"}`}
      </p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          inputMode={hotel ? "tel" : "email"}
          autoComplete="off"
          aria-label={`${draft.name}'s ${hotel ? "phone number" : "phone or email"}`}
          placeholder={hotel ? "Phone number" : "Phone or email"}
          aria-invalid={error ? true : undefined}
          className="min-h-12 min-w-0 flex-1 rounded-control border-2 border-transparent bg-sunk px-3.5 text-[16px] font-medium text-ink outline-none transition-[border-color] placeholder:font-normal placeholder:text-ink-3 focus:border-ink"
        />
        <Button type="submit" variant="plate" size="md">
          Save
        </Button>
      </div>
      {error && <p className="text-[14px] font-semibold text-bad-fg">{error}</p>}
      <div className="flex gap-3">
        {contacts && (
          <button type="button" onClick={pick} className="ck-press min-h-11 cursor-pointer text-[15px] font-bold underline underline-offset-4">
            Pick from contacts
          </button>
        )}
        {canCancel && (
          <button type="button" onClick={onDone} className="ck-press min-h-11 cursor-pointer text-[15px] font-bold underline underline-offset-4">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
