import type { HTMLAttributes, ReactNode } from "react";
import type { FlightStatus } from "@/lib/types";
import { Icon, type IconName } from "./Icon";
export type Tone = "ok" | "warn" | "bad" | "done" | "neutral";
const toneStatus = { ok: "on-time", warn: "warning", bad: "danger", done: "resolved", neutral: "neutral" } as const;
export type BadgeStatus = "on-time" | "warning" | "danger" | "resolved" | "neutral";
const labels: Record<BadgeStatus, string> = { "on-time": "On time", warning: "Delayed / tight", danger: "Cancelled / missed", resolved: "Resolved", neutral: "Update" };
const paths: Record<BadgeStatus, ReactNode> = {
 "on-time": <><circle cx="8" cy="8" r="5.5" /><path d="M8 4.5V8l2.5 1.5" /></>,
 warning: <><path d="M8 2 14 13H2Z" /><path d="M8 6v3m0 2v.1" /></>,
 danger: <><path d="M5 2h6l3 3v6l-3 3H5l-3-3V5Z" /><path d="m6 6 4 4m0-4-4 4" /></>,
 resolved: <><circle cx="8" cy="8" r="5.5" /><path d="m5 8 2 2 4-4" /></>,
 neutral: <><circle cx="8" cy="8" r="5.5" /><path d="M8 7v4m0-7v.1" /></>,
};
export function Badge({ status, tone = "neutral", icon, size = "sm", children, className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { status?: BadgeStatus; tone?: Tone; icon?: IconName | null; size?: "sm" | "md" }) {
 const resolved = status ?? toneStatus[tone];
 return <span className={`ck-badge ck-badge-${resolved} ${size === "md" ? "ck-badge-md" : ""} ${className}`} {...props}>{icon ? <Icon name={icon} size={16} /> : icon !== null && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[resolved]}</svg>}{children ?? labels[resolved]}</span>;
}
export const TONE_ICON: Record<Tone, IconName | null> = { ok: "circle-check", warn: "alert", bad: "circle-x", done: "checks", neutral: null };
export const FLIGHT_STATUS_BADGE: Record<FlightStatus, { tone: Tone; label: string }> = { scheduled: { tone: "ok", label: "On time" }, delayed: { tone: "warn", label: "Delayed" }, cancelled: { tone: "bad", label: "Cancelled" }, rebooked: { tone: "done", label: "Rebooked" } };
export const CONNECTION_BADGE = { ok: { tone: "ok", label: "Enough time" }, tight: { tone: "warn", label: "Tight connection" }, missed: { tone: "bad", label: "Missed connection" } } as const;
export function FlightStatusBadge({ status, size }: { status: FlightStatus; size?: "sm" | "md" }) { const badge = FLIGHT_STATUS_BADGE[status]; return <Badge tone={badge.tone} size={size}>{badge.label}</Badge>; }
