"use client";

import { useState } from "react";
import { Button, Icon, SelectField, Sheet, cx } from "@/components/ui";
import { useTripStore } from "@/lib/store";

type Props = {
  label: string;
  date: string;
  time: string;
  onApply: (date: string, time: string) => void;
  onCancel: () => void;
};

const pad = (n: number) => String(n).padStart(2, "0");
const hours = Array.from({ length: 24 }, (_, n) => ({ value: pad(n), label: pad(n) }));
const hours12 = Array.from({ length: 12 }, (_, n) => ({ value: String(n + 1), label: String(n + 1) }));
const minutes = Array.from({ length: 60 }, (_, n) => ({ value: pad(n), label: pad(n) }));
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthDate(year: number, month: number, day: number) {
  const result = new Date(0);
  result.setUTCFullYear(year, month, day);
  return result;
}

/** A local, offline calendar; applying keeps airport/hotel wall-clock times unchanged. */
export function BookingDatePicker({ label, date, time, onApply, onCancel }: Props) {
  const format = useTripStore((s) => s.settings.timeFormat);
  const [chosen, setChosen] = useState(date);
  const [hour, setHour] = useState(Number(time.slice(0, 2)));
  const [minute, setMinute] = useState(time.slice(3, 5));
  const [month, setMonth] = useState(() => ({ year: Number(date.slice(0, 4)), index: Number(date.slice(5, 7)) - 1 }));
  const first = monthDate(month.year, month.index, 1);
  const offset = first.getUTCDay();
  const count = monthDate(month.year, month.index + 1, 0).getUTCDate();
  const monthLabel = first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const moveMonth = (step: number) => {
    const next = monthDate(month.year, month.index + step, 1);
    setMonth({ year: next.getUTCFullYear(), index: next.getUTCMonth() });
  };

  return (
    <Sheet open onClose={onCancel} title={`Choose ${label.toLowerCase()} date and time`}
      footer={<div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" className="flex-1" icon="check" onClick={() => onApply(chosen, `${pad(hour)}:${minute}`)}>Use date & time</Button>
      </div>}>
    <div role="group" aria-label={`Choose ${label.toLowerCase()} date and time`} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label="Previous month" disabled={month.year <= 2000 && month.index === 0} onClick={() => moveMonth(-1)} className="inline-flex h-11 w-11 items-center justify-center rounded-control hover:bg-surface disabled:opacity-30"><Icon name="chevron-left" size={20} /></button>
        <p aria-live="polite" className="font-semibold">{monthLabel}</p>
        <button type="button" aria-label="Next month" disabled={month.year >= 2100 && month.index === 11} onClick={() => moveMonth(1)} className="inline-flex h-11 w-11 items-center justify-center rounded-control hover:bg-surface disabled:opacity-30"><Icon name="chevron-right" size={20} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((day) => <span key={day} aria-hidden="true" className="pb-1 text-center text-[11px] font-medium text-ink-2">{day}</span>)}
        {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
        {Array.from({ length: count }, (_, index) => {
          const day = index + 1;
          const value = `${String(month.year).padStart(4, "0")}-${pad(month.index + 1)}-${pad(day)}`;
          const selected = value === chosen;
          return <button key={value} type="button" aria-pressed={selected}
            aria-label={monthDate(month.year, month.index, day).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
            onClick={() => setChosen(value)} className={cx("flex min-h-11 min-w-0 items-center justify-center rounded-control font-num text-[14px] transition-colors", selected ? "bg-signal font-semibold text-on-signal" : "hover:bg-surface")}>{day}</button>;
        })}
      </div>
      <div className={cx("grid gap-2", format === "12h" ? "grid-cols-3" : "grid-cols-2")}>
        <SelectField label="Hour" value={format === "12h" ? String(hour % 12 || 12) : pad(hour)} options={format === "12h" ? hours12 : hours}
          onChange={(event) => setHour(format === "12h" ? Number(event.target.value) % 12 + (hour >= 12 ? 12 : 0) : Number(event.target.value))} />
        <SelectField label="Minute" value={minute} options={minutes} onChange={(event) => setMinute(event.target.value)} />
        {format === "12h" && <SelectField label="AM / PM" value={hour >= 12 ? "PM" : "AM"} options={[{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }]}
          onChange={(event) => setHour(hour % 12 + (event.target.value === "PM" ? 12 : 0))} />}
      </div>
    </div>
    </Sheet>
  );
}
