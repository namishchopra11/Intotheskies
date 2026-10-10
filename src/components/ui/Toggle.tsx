"use client";

import { useId } from "react";
import { cx } from "./cx";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
};

/** A full-width row with a switch. The whole row is the tap target. */
export function Toggle({ checked, onChange, label, description, disabled, className }: ToggleProps) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-l`}
      aria-describedby={description ? `${id}-d` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "flex min-h-14 w-full items-center gap-4 rounded-control py-2 text-left",
        "disabled:opacity-45",
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        <span id={`${id}-l`} className="block font-medium text-ink">
          {label}
        </span>
        {description && (
          <span id={`${id}-d`} className="mt-0.5 block text-[14px] leading-snug text-ink-3">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          "relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full border transition-colors",
          checked ? "border-accent bg-accent" : "border-line-strong bg-sunk",
        )}
      >
        <span
          className={cx(
            "absolute h-6 w-6 rounded-full shadow-sm transition-[left] duration-150",
            checked ? "left-[23px] bg-on-accent" : "left-[3px] bg-surface",
          )}
        />
      </span>
    </button>
  );
}
