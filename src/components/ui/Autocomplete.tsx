"use client";

import { useId, useState, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { cx } from "./cx";
import { Field } from "./Field";

export type AutocompleteOption = { value: string; label?: string; hint?: string };

type AutocompleteProps<O extends AutocompleteOption> = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  /** Already filtered for what's typed; the component only shows them. */
  options: O[];
  /** Called when an option is chosen (after onChange with its value). */
  onPick?: (option: O) => void;
  className?: string;
};

/**
 * A text field that offers predictions in a list under it as you type. Pick with a tap, or
 * with the arrow keys and Enter; Escape closes the list. Typing anything else still works,
 * so a prediction never gets in the way of an answer that isn't in the list.
 */
export function Autocomplete<O extends AutocompleteOption>({
  label,
  hint,
  error,
  value,
  onChange,
  options,
  onPick,
  className,
  ...input
}: AutocompleteProps<O>) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const shown = open && options.length > 0;

  const pick = (o: O) => {
    onChange(o.value);
    onPick?.(o);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (options.length ? (i + step + options.length) % options.length : -1));
    } else if (e.key === "Enter" && shown && active >= 0) {
      e.preventDefault(); // pick, don't submit the form
      pick(options[active]);
    } else if (e.key === "Escape" && shown) {
      e.preventDefault();
      e.stopPropagation(); // close the list, not the sheet around it
      setOpen(false);
    }
  };

  return (
    <div className={cx("relative", className)}>
      <Field
        {...input}
        label={label}
        hint={hint}
        error={error}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={listId}
        aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {shown && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="ck-pop absolute inset-x-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-control bg-surface p-1 shadow-float"
        >
          {options.map((o, i) => (
            <li
              key={`${o.value}-${o.hint ?? ""}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: picking must happen before the input loses focus.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={cx(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-[3px] px-3 text-[16px]",
                i === active && "bg-sign text-on-sign",
              )}
            >
              <span className="min-w-0 flex-1 truncate font-medium">{o.label ?? o.value}</span>
              {o.hint && <span className={cx("shrink-0 truncate text-[13px]", i === active ? "text-on-sign" : "text-ink-2")}>{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
