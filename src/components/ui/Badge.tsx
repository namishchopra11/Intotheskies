import type { HTMLAttributes, ReactNode } from "react";
export type BadgeStatus = "on-time" | "warning" | "danger" | "resolved" | "neutral";
const labels: Record<BadgeStatus, string> = { "on-time": "On time", warning: "Delayed / tight", danger: "Cancelled / missed", resolved: "Resolved", neutral: "Update" };
const paths: Record<BadgeStatus, ReactNode> = {
 "on-time": <><circle cx="8" cy="8" r="5.5" /><path d="M8 4.5V8l2.5 1.5" /></>,
 warning: <><path d="M8 2 14 13H2Z" /><path d="M8 6v3m0 2v.1" /></>,
 danger: <><path d="M5 2h6l3 3v6l-3 3H5l-3-3V5Z" /><path d="m6 6 4 4m0-4-4 4" /></>,
 resolved: <><circle cx="8" cy="8" r="5.5" /><path d="m5 8 2 2 4-4" /></>,
 neutral: <><circle cx="8" cy="8" r="5.5" /><path d="M8 7v4m0-7v.1" /></>,
};
export function Badge({ status = "neutral", children, className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { status?: BadgeStatus }) {
 return <span className={`ck-badge ck-badge-${status} ${className}`} {...props}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[status]}</svg>{children ?? labels[status]}</span>;
}
