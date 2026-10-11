"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";
import { NAV_BACK } from "./PageTransition";

// The Layover screens visited in this tab, oldest first, so Back knows whether there is one of
// ours to return to. Opened straight from a link there isn't, so Back goes to `fallback`.
let stack: string[] = [];
let popped = false;
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getCanGoBack = () => stack.length > 1 && window.history.length > 1;
const getServerCanGoBack = () => false;

/** Mounted once in the root layout: follows moves between screens, forward and back. */
export function NavHistory() {
  const pathname = usePathname();
  useEffect(() => {
    const onPop = () => (popped = true);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (stack[stack.length - 1] === pathname) return;
    if (popped && stack[stack.length - 2] === pathname) stack = stack.slice(0, -1);
    else stack = [...stack, pathname];
    popped = false;
    listeners.forEach((cb) => cb());
  }, [pathname]);
  return null;
}

type BackButtonProps = {
  /** Where to go when there is no earlier Layover screen in this tab. */
  fallback?: string;
  /** Hide the button when there is no earlier Layover screen (e.g. a page opened from a link). */
  onlyWithHistory?: boolean;
  className?: string;
};

/** A chevron that goes back to the previous screen, or to `fallback` when there isn't one. */
export function BackButton({ fallback = "/", onlyWithHistory = false, className }: BackButtonProps) {
  const router = useRouter();
  const hasHistory = useSyncExternalStore(subscribe, getCanGoBack, getServerCanGoBack);
  if (onlyWithHistory && !hasHistory) return null;
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => (hasHistory ? router.back() : router.push(fallback, { transitionTypes: NAV_BACK }))}
      className={cx(
        "ck-fade -ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink hover:bg-sunk",
        className,
      )}
    >
      <Icon name="chevron-left" size={22} />
    </button>
  );
}
