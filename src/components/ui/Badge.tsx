import type { ReactNode } from "react";
import type { FlightStatus } from "@/lib/types";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

/**
 * ok = on time · warn = delayed or tight · bad = cancelled or missed · done = rebooked or sorted.
 * Each tone has its own icon so the state reads without colour.
 */
export type Tone = "ok" | "warn" | "bad" | "done" | "neutral";

const TONES: Record<Tone, { className: string; icon: IconName | null }> = {
  ok: { className: "bg-ok-bg text-ok-fg", icon: "circle-check" },
  warn: { className: "bg-warn-bg text-warn-fg", icon: "clock" },
  bad: { className: "bg-bad-bg text-bad-fg", icon: "x" },
  done: { className: "bg-done-bg text-done-fg", icon: "check" },
  neutral: { className: "bg-sunk text-ink-2", icon: null },
};

type BadgeProps = {
  tone?: Tone;
  children: ReactNode;
  /** Override the tone's icon, or pass null to hide it. */
  icon?: IconName | null;
  size?: "sm" | "md";
  className?: string;
};

export function Badge({ tone = "neutral", children, icon, size = "sm", className }: BadgeProps) {
  const t = TONES[tone];
  const iconName = icon === undefined ? t.icon : icon;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-badge font-semibold",
        size === "sm" ? "h-[26px] pr-2.5 pl-2 text-[13px]" : "h-8 pr-3 pl-2.5 text-[15px]",
        t.className,
        className,
      )}
    >
      {iconName && <Icon name={iconName} size={size === "sm" ? 14 : 16} strokeWidth={2.5} />}
      {children}
    </span>
  );
}

/** Tone and wording for a flight's status: <Badge tone={...}>{label}</Badge>. */
export const FLIGHT_STATUS_BADGE: Record<FlightStatus, { tone: Tone; label: string }> = {
  scheduled: { tone: "ok", label: "On time" },
  delayed: { tone: "warn", label: "Delayed" },
  cancelled: { tone: "bad", label: "Cancelled" },
  rebooked: { tone: "done", label: "Rebooked" },
};

/** Tone and wording for Impact.connection.status. */
export const CONNECTION_BADGE: Record<"ok" | "tight" | "missed", { tone: Tone; label: string }> = {
  ok: { tone: "ok", label: "Enough time" },
  tight: { tone: "warn", label: "Tight connection" },
  missed: { tone: "bad", label: "Missed connection" },
};

export function FlightStatusBadge({ status, size }: { status: FlightStatus; size?: "sm" | "md" }) {
  const b = FLIGHT_STATUS_BADGE[status];
  return (
    <Badge tone={b.tone} size={size}>
      {b.label}
    </Badge>
  );
}
