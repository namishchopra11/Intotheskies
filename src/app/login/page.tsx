"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, HomeLogo, Icon, cx } from "@/components/ui";
import { useStoreReady, useTripStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { SocialSignIn } from "./SocialSignIn";

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

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);

  // Settings links here as /login#create for guests who want an account. Next keeps this page
  // alive between visits, so set the tab every time it's shown and drop what was typed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(window.location.hash === "#create" ? "create" : "signin");
    setPassword("");
    setTried(false);
  }, []);

  // Already signed in (not as a guest): nothing to do here.
  useEffect(() => {
    if (ready && profile && !profile.guest) router.replace("/");
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
    signIn({ name: creating ? name : nameFromEmail(email), email, guest: false, provider: "email" });
    setPassword("");
    router.replace("/");
  };

  const social = (profile: Profile) => {
    signIn(profile);
    router.replace("/");
  };

  const guest = () => {
    signIn({ name: "", email: "", guest: true });
    router.replace("/");
  };

  return (
    <main className="flex flex-1 flex-col px-5 pt-[max(env(safe-area-inset-top),28px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      <div className="ck-rise">
        <HomeLogo />
      </div>

      <section className="ck-rise pt-10 pb-6">
        <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.01em]">
          {creating ? "Create your account" : "Welcome to Layover"}
        </h1>
        <p className="mt-2 text-ink-2">
          {creating
            ? "Keep your trips in one place, and let Layover handle the changes."
            : "Log in to see your trip, or continue as a guest to try it."}
        </p>
      </section>

      <SocialSignIn onSignIn={social} />

      <div className="my-5 flex items-center gap-3 text-[13px] text-ink-2" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        or use your email
        <span className="h-px flex-1 bg-line" />
      </div>

      <div role="tablist" aria-label="Log in or create an account" className="mb-5 grid grid-cols-2 gap-1 rounded-control bg-sunk p-1">
        {(["signin", "create"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setTried(false);
            }}
            className={cx(
              "min-h-11 cursor-pointer rounded-[8px] text-[15px] font-semibold",
              mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-2",
            )}
          >
            {m === "signin" ? "Log in" : "Create account"}
          </button>
        ))}
      </div>

      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {creating && (
          <Field label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={shown.name} />
        )}
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
          type="password"
          autoComplete={creating ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={shown.password}
          hint={creating ? `At least ${MIN_PASSWORD} characters.` : undefined}
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
        Demo login: Apple and Google sign-in are simulated, your name and email stay on this phone,
        and your password is never saved.
      </p>
    </main>
  );
}
