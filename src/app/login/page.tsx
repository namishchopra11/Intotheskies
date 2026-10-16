"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton, Button, Collapse, Field, Icon, SignArrow, Wordmark, cx } from "@/components/ui";
import { MOTION, gsap, useGSAP } from "@/components/ui/gsap";
import { accountKey, useStoreReady, useTripStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { SocialSignIn } from "./SocialSignIn";
import { useTour } from "@/lib/tour";

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
  const [showPassword, setShowPassword] = useState(false);
  const [tried, setTried] = useState(false);
  // The email form folds out under its key; it starts open when Settings sends a guest here to create an account.
  const [emailOpen, setEmailOpen] = useState(false);
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION.full, () => {
        gsap
          .timeline()
          .fromTo(".lg-field", { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power3.inOut", clearProps: "clipPath" })
          .from(".lg-arrow", { xPercent: -45, autoAlpha: 0, duration: 1.2 }, 0.3)
          .from(".lg-in", { y: 16, autoAlpha: 0, duration: 0.7, stagger: 0.06, clearProps: "all" }, 0.3);
      });
    },
    { scope: root },
  );

  // Settings links here as /login#create for guests who want an account. Next keeps this page
  // alive between visits, so set the tab every time it's shown and drop what was typed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(window.location.hash === "#create" ? "create" : "signin");
    setEmailOpen(window.location.hash === "#create");
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
    <main ref={root} className="flex flex-1 flex-col pb-[max(env(safe-area-inset-bottom),24px)]">
      {/* A black sign across the top: the name, and the arrow pointing on. */}
      <section className="lg-field relative isolate overflow-hidden bg-plate px-5 pt-[max(env(safe-area-inset-top),14px)] pb-8 text-on-plate">
        <SignArrow aria-hidden="true" className="lg-arrow pointer-events-none absolute -right-[26%] top-[18%] -z-10 text-sign" size={300} />
        <div className="flex min-h-11 items-center gap-1">
          <BackButton onlyWithHistory />
          <Wordmark size={26} />
        </div>
        <h1 className="lg-in mt-16 max-w-[300px] font-display text-[56px] leading-[0.9] font-bold">
          {creating ? "Create your account" : "Welcome aboard."}
        </h1>
        <p className="lg-in mt-3 text-[17px] font-medium text-on-plate-2">Your trip, sorted when flights change.</p>
      </section>

      <div className="flex flex-1 flex-col px-4 pt-5">
        <div className="lg-in">
          <SocialSignIn onSignIn={social} />
        </div>

        <div className="lg-in mt-2">
          <button
            type="button"
            aria-expanded={emailOpen}
            aria-controls="login-email"
            onClick={() => setEmailOpen((o) => !o)}
            className="ck-press flex min-h-14 w-full cursor-pointer items-center justify-between rounded-control bg-surface px-5 text-[17px] font-bold"
          >
            <span className="inline-flex items-center gap-2.5">
              <Icon name="message" size={20} strokeWidth={2.25} />
              Continue with email
            </span>
            <SignArrow size={18} direction={emailOpen ? "up" : "down"} />
          </button>
        </div>

        <Collapse open={emailOpen} id="login-email">
          <div className="pt-4">
            <div role="tablist" aria-label="Log in or create an account" className="relative mb-5 grid grid-cols-2 rounded-control bg-surface p-1">
              <span
                aria-hidden="true"
                className="ck-tab-marker pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-[3px] bg-key"
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
                    "relative min-h-11 cursor-pointer rounded-[3px] text-[16px] font-bold transition-colors duration-300",
                    mode === m ? "text-on-key" : "text-ink-2",
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
                    className="ck-press inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-control text-ink-2"
                  >
                    <Icon name={showPassword ? "eye-off" : "eye"} size={20} />
                  </button>
                }
              />
              <Button type="submit" variant="primary" size="lg" block chip="arrow-right" className="mt-1">
                {creating ? "Create account" : "Log in"}
              </Button>
            </form>
          </div>
        </Collapse>

        <div className="lg-in mt-6">
          <Button variant="ghost" block onClick={guest} className="min-h-13 text-[17px] font-bold underline underline-offset-4">
            Continue as guest
          </Button>
        </div>

        <p className="lg-in mt-auto flex items-center justify-center gap-1.5 pt-8 text-[14px] font-medium text-ink-2">
          <Icon name="lock" size={15} />
          Demo login. Stays on this phone.
        </p>
      </div>
    </main>
  );
}
