"use client";

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";

type FieldBase = {
  label: string;
  /** Helper text under the label. */
  hint?: string;
  /** Error message; also marks the control invalid. */
  error?: string;
  className?: string;
};

// 16px text keeps iOS from zooming in on focus.
const CONTROL = cx(
  "block w-full min-h-12 rounded-control border bg-surface px-3.5 text-base text-ink",
  "placeholder:text-ink-3 outline-none transition-colors",
  "focus:border-accent focus:ring-2 focus:ring-accent/25",
  "disabled:opacity-50",
);

function Shell({
  id,
  label,
  hint,
  error,
  className,
  children,
}: FieldBase & { id: string; children: ReactNode }) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="font-medium text-ink">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="-mt-1 text-[14px] leading-snug text-ink-3">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-[14px] text-bad-fg">
          <Icon name="circle-x" size={16} strokeWidth={2} className="mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

const TIME_TYPES = new Set(["date", "time", "datetime-local"]);

/** Label + input + error. Pass any normal <input> props (value, onChange, type, ...). */
export function Field({
  label,
  hint,
  error,
  className,
  id: idProp,
  type = "text",
  ...input
}: FieldBase & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <Shell id={id} label={label} hint={hint} error={error} className={className}>
      <input
        id={id}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cx(
          CONTROL,
          error ? "border-bad" : "border-line-strong",
          TIME_TYPES.has(type) && "font-num tabular-nums",
        )}
        {...input}
      />
    </Shell>
  );
}

/** Label + textarea + error. */
export function TextAreaField({
  label,
  hint,
  error,
  className,
  id: idProp,
  rows = 3,
  ...textarea
}: FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <Shell id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cx(CONTROL, "py-3 leading-snug", error ? "border-bad" : "border-line-strong")}
        {...textarea}
      />
    </Shell>
  );
}

/** Label + select + error. options: [{ value, label }]. */
export function SelectField({
  label,
  hint,
  error,
  className,
  id: idProp,
  options,
  ...select
}: FieldBase &
  SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <Shell id={id} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cx(CONTROL, "appearance-none pr-10", error ? "border-bad" : "border-line-strong")}
          {...select}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-right"
          size={18}
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 rotate-90 text-ink-3"
        />
      </div>
    </Shell>
  );
}
