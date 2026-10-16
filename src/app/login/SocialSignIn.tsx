"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";
import type { Profile } from "@/lib/types";

/**
 * "Continue with Apple" and "Continue with Google". These are simulated for the demo: no
 * Google or Apple account is contacted. After a short pause they sign in a demo profile on
 * this phone, the same way the email form does. The login page says so under the buttons.
 */
export type SocialProvider = "apple" | "google";

const DEMO_PROFILES: Record<SocialProvider, Profile> = {
  // Apple can hide the real address behind a relay; the demo does the same.
  apple: { name: "Alex Morgan", email: "alex.demo@privaterelay.appleid.com", guest: false, provider: "apple" },
  google: { name: "Alex Morgan", email: "alex.morgan.demo@gmail.com", guest: false, provider: "google" },
};

const LABEL: Record<SocialProvider, string> = { apple: "Apple", google: "Google" };
const CONNECT_MS = 700;

export function SocialSignIn({ onSignIn }: { onSignIn: (profile: Profile) => void }) {
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const timer = useRef<number | undefined>(undefined);

  // Next keeps this page alive after you leave it. Reset when it's hidden, so coming back
  // after logging out doesn't find a button still "Connecting…".
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      setPending(null);
    },
    [],
  );

  const start = (provider: SocialProvider) => {
    setPending(provider);
    timer.current = window.setTimeout(() => onSignIn(DEMO_PROFILES[provider]), CONNECT_MS);
  };

  const button = (provider: SocialProvider, className: string, logo: ReactNode) => (
    <button
      type="button"
      onClick={() => start(provider)}
      disabled={pending !== null}
      aria-busy={pending === provider || undefined}
      className={cx(
        "ck-press relative inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-control px-5 text-[17px] font-bold disabled:cursor-default",
        pending && pending !== provider && "opacity-50",
        className,
      )}
    >
      {pending === provider ? (
        <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        logo
      )}
      {pending === provider ? `Connecting to ${LABEL[provider]}…` : `Continue with ${LABEL[provider]}`}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      {button("apple", "bg-band text-on-band", <AppleLogo />)}
      {button("google", "bg-white text-[#1f1f1f]", <GoogleLogo />)}
    </div>
  );
}

function AppleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="20" viewBox="0 0 17 20" fill="currentColor" className="-mt-0.5 shrink-0">
      <path d="M14.06 10.62c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.29-3.52ZM11.88 4.16c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.68-.92 2.67.97.08 1.96-.49 2.56-1.22Z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48" className="shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
