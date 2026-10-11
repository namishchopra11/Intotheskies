"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton, Button, Field, HomeLogo, Icon, cx } from "@/components/ui";
import { accountKey, useStoreReady, useTripStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { SocialSignIn } from "./SocialSignIn";
import { useTour } from "@/lib/tour";
import { hasStartedSession, markSessionStarted } from "@/components/trip/useRequireProfile";

type Mode = "signin" | "create";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/** "alex.morgan@example.com" -> "Alex Morgan", for a sign-in that doesn't ask for a name. */
function nameFromEmail(email: string): string {
  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Demo sign-in. There is no server: the name and email are kept on this phone so the app
 * can greet the traveler, and the password is checked for length and then thrown away.
 */
export default function LoginPage() {
  const ready = useStoreReady();
  const profile = useTripStore((s) => s.profile);
  const signIn = useTripStore((s) => s.signIn);
  const router = useRouter();
  // Opening the link always lands here first, even when a profile is saved on the phone.
  const wasStarted = useRef(hasStartedSession());

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tried, setTried] = useState(false);

  // Settings links here as /login#create for guests who want an account. Next keeps this page
  // alive between visits, so set the tab every time it's shown and drop what was typed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(window.location.hash === "#create" ? "create" : "signin");
    setPassword("");
    setTried(false);
  }, []);

  useEffect(() => {
    markSessionStarted();
  }, []);

  // Already signed in (not as a guest) and past the first screen: nothing to do here.
  useEffect(() => {
    if (ready && profile && !profile.guest && wasStarted.current) router.replace("/");
  }, [ready, profile, router]);

  const creating = mode === "create";
  const errors = {
    name: creating && !name.trim() ? "Add your name." : undefined,
    email: !EMAIL.test(email.trim()) ? "Enter a valid email address." : undefined,
    password:
      password.length < MIN_PASSWORD ? `Use at least ${MIN_PASSWORD} characters.` : undefined,
  };
  const shown: Partial<typeof errors> = tried ? errors : {};

  const submit = () => {
    setTried(true);
    if (errors.name || errors.email || errors.password) return;
    // Logging back in: the name this account had on this phone, else one made from the email.
    const key = accountKey({ name: "", email, guest: false, provider: "email" });
    const known = key ? useTripStore.getState().accounts[key]?.name : undefined;
    const nextProfile: Profile = { name: creating ? name : known || nameFromEmail(email), email, guest: false, provider: "email" };
    signIn(nextProfile);
    if (creating) useTour.getState().start(nextProfile);
    setPassword("");
    router.replace("/");
  };

  const social = (profile: Profile) => {
    const key = accountKey(profile);
    const known = key && useTripStore.getState().accounts[key];
    signIn(profile);
    if (!known) useTour.getState().start(profile);
    router.replace("/");
  };

  const guest = () => {
    signIn({ name: "", email: "", guest: true });
    router.replace("/");
  };

  return (
    <main className="flex flex-1 flex-col px-5 pt-[max(env(safe-area-inset-top),28px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      <div className="ck-rise flex items-center gap-1">
        <BackButton onlyWithHistory />
        <HomeLogo />
      </div>

      <section key={mode} className="ck-auth-copy pt-10 pb-6">
        <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.01em]">
          {creating ? "Create your account" : "Welcome to Layover"}
        </h1>
      </section>

      <SocialSignIn onSignIn={social} />

      <div className="my-5 flex items-center gap-3 text-[13px] text-ink-2" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        or use your email
        <span className="h-px flex-1 bg-line" />
      </div>

      <div role="tablist" aria-label="Log in or create an account" className="relative mb-5 grid grid-cols-2 rounded-control bg-sunk p-1">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-[8px] bg-surface shadow-sm transition-transform duration-300 ease-out"
          style={{ transform: creating ? "translateX(100%)" : "translateX(0)" }}
        />
        {(["signin", "create"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setTried(false);
              setShowPassword(false);
            }}
            className={cx(
              "relative min-h-11 cursor-pointer rounded-[8px] text-[15px] font-semibold transition-colors duration-300",
              mode === m ? "text-ink" : "text-ink-2",
            )}
          >
            {m === "signin" ? "Log in" : "Create account"}
          </button>
        ))}
      </div>

      <form
        className="ck-auth-form flex flex-col gap-4"
        data-mode={mode}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div
          aria-hidden={!creating}
          inert={!creating}
          className={cx(
            "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out",
            creating ? "grid-rows-[1fr] opacity-100" : "-mb-4 grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <Field label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={shown.name} disabled={!creating} />
          </div>
        </div>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={shown.email}
        />
        <Field
          label="Password"
          id="login-password"
          type={showPassword ? "text" : "password"}
          autoComplete={creating ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={shown.password}
          hint={creating ? `At least ${MIN_PASSWORD} characters.` : undefined}
          endAdornment={
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-controls="login-password"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-control text-ink-2 hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Icon name={showPassword ? "eye-off" : "eye"} size={20} />
            </button>
          }
        />
        <Button type="submit" variant="primary" size="lg" block chip="arrow-right" className="mt-2">
          {creating ? "Create account" : "Log in"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[13px] text-ink-2" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <Button variant="secondary" block onClick={guest}>
        Continue as guest
      </Button>

      <p className="mt-auto flex items-start gap-2 pt-8 text-[13px] leading-snug text-ink-2">
        <Icon name="lock" size={16} className="mt-px" />
        Demo login. Stays on this phone.
      </p>
    </main>
  );
}
