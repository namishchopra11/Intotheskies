"use client";

import { useSyncExternalStore } from "react";
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
  return p === "dark" || p === "system" ? p : "light";
}

/** Light / Dark / Auto (follows the phone). Remembered on this device. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const pref = useSyncExternalStore(subscribe, getPref, () => "light" as ThemePreference);
  return (
    <div role="radiogroup" aria-label="Appearance" className="inline-flex rounded-control bg-sunk p-1">
      {OPTIONS.map((o) => {
        const active = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={compact ? o.label : undefined}
            onClick={() => window.__ckApplyTheme?.(o.value)}
            className={cx(
              "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-[9px] px-2.5 text-[14px] font-medium transition-colors",
              active ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink",
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
