"use client";

import { useTimeFormat } from "@/lib/useTimeFormat";
import { useId, useRef, useState } from "react";
import { Icon, cx } from "@/components/ui";
import { formatDate } from "@/lib/domain/time";
import { formatDateInput, parseDate, parseTime, todayYMD } from "./dateInput";
import { BookingDatePicker } from "./BookingDatePicker";

type Props = {
  label: string;
  hint?: string;
  error?: string;
  /** "YYYY-MM-DDTHH:mm" when both parts read, otherwise the raw text (fails validation). */
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const CONTROL =
  "block min-h-12 w-full rounded-control border bg-surface px-3.5 text-base text-ink font-num tabular-nums placeholder:font-sans placeholder:text-ink-3 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25";

// US readers write 10/17 for 17 October; most others write 17/10.
const dayFirst = () => typeof navigator === "undefined" || !/^en-US$/i.test(navigator.language);

/**
 * A date box and a time box you can type into ("17 Oct", "tomorrow", "2:35pm"), plus a
 * calendar button for picking instead. Under it, how the date was read, so a wrong guess
 * is easy to spot.
 */
export function DateTimeField({ label, hint, error, value, onChange, className }: Props) {
  const displayTime = useTimeFormat();
  const id = useId();
  const picker = useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const initial = LOCAL.test(value) ? value : "";
  const [dateText, setDateText] = useState(initial ? formatDateInput(initial.slice(0, 10)) : "");
  const [timeText, setTimeText] = useState(initial ? displayTime(initial.slice(11)) : "");

  const date = parseDate(dateText, todayYMD(), dayFirst());
  const time = parseTime(timeText);

  const emit = (d: string, t: string) => {
    const pd = parseDate(d, todayYMD(), dayFirst());
    const pt = parseTime(t);
    if (pd && pt) onChange(`${pd}T${pt}`);
    else onChange(d.trim() || t.trim() ? `${d}|${t}` : "");
  };

  const dateUnread = dateText.trim() !== "" && !date;
  const timeUnread = timeText.trim() !== "" && !time;
  // An error with both boxes read is about the value itself ("check-out after check-in").
  const ruleError = Boolean(error && date && time);
  const dateInvalid = dateUnread || Boolean(error && !date) || ruleError;
  const timeInvalid = timeUnread || Boolean(error && !time) || ruleError;
  const describedBy = [hint && `${id}-hint`, `${id}-read`, error && `${id}-error`].filter(Boolean).join(" ");

  return (
    <fieldset className={cx("flex min-w-0 flex-col gap-1.5", className)} aria-describedby={describedBy}>
      <legend className="mb-1.5 font-medium text-ink">{label}</legend>
      {hint && (
        <p id={`${id}-hint`} className="-mt-1 text-[14px] leading-snug text-ink-3">
          {hint}
        </p>
      )}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-[3_1_0]">
          <input
            aria-label={`${label} date`}
            placeholder="17 Oct 2026"
            value={dateText}
            autoComplete="off"
            onChange={(e) => {
              setDateText(e.target.value);
              emit(e.target.value, timeText);
            }}
            // Tidy what was typed into one clear form once the box is left.
            onBlur={() => date && setDateText(formatDateInput(date))}
            aria-invalid={dateInvalid || undefined}
            className={cx(CONTROL, "pr-12", dateInvalid ? "border-bad" : "border-line-strong")}
          />
          <button
            ref={picker}
            type="button"
            aria-label={`Pick ${label.toLowerCase()} date and time from a calendar`}
            aria-expanded={pickerOpen}
            aria-controls={`${id}-picker`}
            onClick={() => setPickerOpen((open) => !open)}
            className="absolute top-1/2 right-1 inline-flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-control text-ink-2 hover:bg-sunk"
          >
            <Icon name="calendar" size={18} />
          </button>
        </div>
        <input
          aria-label={`${label} time`}
          placeholder={displayTime("14:25")}
          inputMode="text"
          value={timeText}
          autoComplete="off"
          onChange={(e) => {
            setTimeText(e.target.value);
            emit(dateText, e.target.value);
          }}
          onBlur={() => time && setTimeText(displayTime(time))}
          aria-invalid={timeInvalid || undefined}
          className={cx(CONTROL, "min-w-0 flex-[2_1_0]", timeInvalid ? "border-bad" : "border-line-strong")}
        />
      </div>
      {pickerOpen && <div id={`${id}-picker`}>
        <BookingDatePicker label={label} date={date ?? parseDate("today", todayYMD())!} time={time ?? "09:00"}
          onCancel={() => { setPickerOpen(false); picker.current?.focus(); }}
          onApply={(pickedDate, pickedTime) => {
            const text = formatDateInput(pickedDate);
            setDateText(text);
            setTimeText(displayTime(pickedTime));
            onChange(`${pickedDate}T${pickedTime}`);
            setPickerOpen(false);
            picker.current?.focus();
          }} />
      </div>}
      <p id={`${id}-read`} aria-live="polite" className="min-h-5 text-[13px] leading-snug text-ink-2">
        {dateUnread
          ? "Couldn't read that date. Try 17 Oct 2026."
          : timeUnread
            ? "Couldn't read that time. Try 14:25 or 2:25pm."
            : date
              ? `${formatDate(`${date}T00:00`)} ${date.slice(0, 4)}${time ? ` at ${displayTime(time)}` : ""}`
              : ""}
      </p>
      {error && !dateUnread && !timeUnread && (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-[14px] text-bad-fg">
          <Icon name="circle-x" size={16} strokeWidth={2} className="mt-0.5" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
