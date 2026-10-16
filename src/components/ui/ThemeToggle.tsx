"use client";

import { useSyncExternalStore, type KeyboardEvent } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";
import type { ThemePreference } from "./theme";

declare global {
  interface Window {
    __ckApplyTheme?: (pref: ThemePreference) => void;
  }
}

const OPTIONS: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "Auto", icon: "contrast" },
];

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-pref"] });
  return () => obs.disconnect();
}
function getPref(): ThemePreference {
  const p = document.documentElement.getAttribute("data-theme-pref");
  return p === "light" || p === "dark" ? p : "system";
}

/** Where an arrow, Home or End key moves the choice from `index`, or null for any other key. */
function targetIndex(key: string, index: number): number | null {
  const last = OPTIONS.length - 1;
  if (key === "ArrowRight" || key === "ArrowDown") return index === last ? 0 : index + 1;
  if (key === "ArrowLeft" || key === "ArrowUp") return index === 0 ? last : index - 1;
  if (key === "Home") return 0;
  if (key === "End") return last;
  return null;
}

/**
 * Light / Dark / Auto (follows the phone). Remembered on this device. A radio group: Tab
 * lands on the chosen one, and the arrow keys move and choose, as native radios do. `compact`
 * shows icons only, with the label as each option's accessible name.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const pref = useSyncExternalStore(subscribe, getPref, () => "system" as ThemePreference);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const to = targetIndex(e.key, index);
    if (to === null) return;
    e.preventDefault();
    window.__ckApplyTheme?.(OPTIONS[to].value);
    (e.currentTarget.parentElement?.children[to] as HTMLElement | undefined)?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Appearance" className={cx("rounded-control bg-sunk p-1", compact ? "inline-flex" : "grid w-full grid-cols-3")}>
      {OPTIONS.map((o, i) => {
        const active = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            aria-label={compact ? o.label : undefined}
            onClick={() => window.__ckApplyTheme?.(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cx(
              "inline-flex min-h-10 min-w-11 items-center justify-center gap-1.5 rounded-[3px] px-3 text-[15px] font-semibold transition-[background-color,color] duration-200",
              active ? "bg-key text-on-key" : "text-ink-2 [@media(hover:hover)]:hover:text-ink",
            )}
          >
            <Icon name={o.icon} size={18} />
            {!compact && o.label}
          </button>
        );
      })}
    </div>
  );
}
