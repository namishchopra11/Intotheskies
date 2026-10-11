"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { initials } from "@/components/trip/ProfileButton";
import { SPEECH_VOICES } from "@/components/trip/speechVoices";
import { useRequireProfile } from "@/components/trip/useRequireProfile";
import { Button, Card, Field, PageHeader, PageTransition, SelectField, Sheet, ThemeToggle, Toggle } from "@/components/ui";
import { useTripStore } from "@/lib/store";
import { SpeechVoiceSchema, type Profile } from "@/lib/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SettingsPage() {
  const ok = useRequireProfile();
  const profile = useTripStore((s) => s.profile);

  return (
    <PageTransition>
      <main className="flex flex-1 flex-col">
        <PageHeader variant="bar" title="Settings" back={{ href: "/", label: "Back to trip status" }} />
        {ok && profile && (
          <div className="flex flex-col gap-7 px-4 pb-[max(env(safe-area-inset-bottom),28px)]">
            <Account profile={profile} />
            <AutoUpdates />
            <Notifications />
            <Group title="Appearance">
              <ThemeToggle />
            </Group>
            <ListenVoice />
            <Demo />
            <YourData />
            <p className="px-1 text-[13px] leading-snug text-ink-2">
              Layover keeps your trips on this phone. Confirmations you import are sent to Claude, Anthropic&apos;s AI,
              to be read.
            </p>
          </div>
        )}
      </main>
    </PageTransition>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="ck-label px-1">{title}</h2>
      {children}
    </section>
  );
}

function Account({ profile }: { profile: Profile }) {
  const updateProfile = useTripStore((s) => s.updateProfile);
  const signOut = useTripStore((s) => s.signOut);
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [saved, setSaved] = useState(false);
  const changed = name.trim() !== profile.name || email.trim() !== profile.email;
  const emailError = email.trim() && !EMAIL.test(email.trim()) ? "Enter a valid email address." : undefined;

  return (
    <Group title="Account">
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-band font-semibold text-on-band"
          >
            {initials(profile)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{profile.guest ? "Guest" : profile.name || "Your account"}</span>
            <span className="block truncate text-[14px] text-ink-2">
              {profile.guest ? "Not signed in" : profile.email}
            </span>
          </span>
        </div>

        {profile.guest ? (
          <Button
            variant="primary"
            block
            onClick={() => {
              signOut();
              router.push("/login#create");
            }}
          >
            Create an account
          </Button>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!changed || emailError || !email.trim()) return;
              updateProfile({ name: name.trim(), email: email.trim() });
              setSaved(true);
            }}
          >
            <Field label="Name" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setSaved(false); }}
              error={emailError}
            />
            <Button type="submit" variant={saved ? "success" : "secondary"} block icon={saved ? "check" : undefined} disabled={!changed && !saved}>
              {saved ? "Saved" : "Save changes"}
            </Button>
          </form>
        )}

        <Button
          variant="secondary"
          block
          icon="arrow-right"
          onClick={() => {
            signOut();
            router.replace("/login");
          }}
        >
          Log out
        </Button>
      </Card>
    </Group>
  );
}

function AutoUpdates() {
  const settings = useTripStore((s) => s.settings);
  const updateSettings = useTripStore((s) => s.updateSettings);
  return (
    <Group title="When a flight changes">
      <Card className="flex flex-col divide-y divide-line-soft py-1">
        <Toggle
          checked={settings.notifyHotel}
          onChange={(notifyHotel) => updateSettings({ notifyHotel })}
          label="Tell my hotel"
          description="Send your hotel the new arrival time and ask them to hold the room."
        />
        <Toggle
          checked={settings.moveRides}
          onChange={(moveRides) => updateSettings({ moveRides })}
          label="Move my pickups"
          description="Shift airport pickups to match your new landing time."
        />
      </Card>
      <p className="px-1 text-[13px] leading-snug text-ink-2">
        Your flights are always tracked. Anything switched off is added to your to-do list instead.
      </p>
    </Group>
  );
}

/** One switch for flight-change alerts. Turning it on also asks for phone notifications. */
function Notifications() {
  const on = useTripStore((s) => s.settings.notifications);
  const updateSettings = useTripStore((s) => s.updateSettings);
  const [phone, setPhone] = useState<NotificationPermission | "unsupported">("unsupported");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhone("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  const toggle = async (next: boolean) => {
    updateSettings({ notifications: next });
    if (next && phone === "default") setPhone(await Notification.requestPermission());
  };

  // The browser's own permission can only be changed in its settings, so say where things stand.
  const description = !on
    ? "Off. Your trip still updates when a flight changes, but you won't get an alert."
    : {
        granted: "On. You'll see an alert in the app and on your phone when a flight changes.",
        denied: "On in the app. Phone alerts are blocked for this site in your browser settings.",
        default: "On in the app. Allow phone alerts to get them when the app isn't open.",
        unsupported: "On. You'll see an alert in the app when a flight changes.",
      }[phone];

  return (
    <Group title="Notifications">
      <Card className="flex flex-col gap-2 py-1">
        <Toggle checked={on} onChange={toggle} label="Flight change alerts" description={description} />
        {on && phone === "default" && (
          <Button
            variant="secondary"
            block
            icon="message"
            className="mb-3"
            onClick={async () => setPhone(await Notification.requestPermission())}
          >
            Allow phone alerts
          </Button>
        )}
      </Card>
    </Group>
  );
}

/** The ElevenLabs voice used by "Listen to summary" on the trip screen. */
function ListenVoice() {
  const voice = useTripStore((s) => s.settings.voice);
  const updateSettings = useTripStore((s) => s.updateSettings);
  return (
    <Group title="Listen to summary">
      <Card>
        <SelectField
          label="Voice"
          hint="Used when you press Listen to summary."
          value={voice}
          onChange={(e) => {
            const next = SpeechVoiceSchema.safeParse(e.target.value);
            if (next.success) updateSettings({ voice: next.data });
          }}
          options={Object.entries(SPEECH_VOICES).map(([value, v]) => ({ value, label: v.label }))}
        />
      </Card>
    </Group>
  );
}

/** The presenter's "Next" button (components/trip/DemoNextButton.tsx). */
function Demo() {
  const on = useTripStore((s) => s.settings.demoControls);
  const updateSettings = useTripStore((s) => s.updateSettings);
  return (
    <Group title="Demo">
      <Card className="py-1">
        <Toggle
          checked={on}
          onChange={(demoControls) => updateSettings({ demoControls })}
          label="Demo controls"
          description={
            on
              ? "Shows a Next button that walks through every screen. Flights change only when you press it."
              : "Off. Flights change on their own a few seconds after a trip loads."
          }
        />
      </Card>
    </Group>
  );
}

/** What's stored, and deleting the account (which is everything on this phone). */
function YourData() {
  const trip = useTripStore((s) => s.trip);
  const saved = useTripStore((s) => s.savedTrips.length);
  const guest = useTripStore((s) => s.profile?.guest ?? false);
  const signOut = useTripStore((s) => s.signOut);
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  // A guest has no account, only data on this phone.
  const what = guest ? "Delete my data" : "Delete account";

  return (
    <Group title="Your data">
      <Card className="flex flex-col gap-3">
        <p className="text-[15px] leading-snug">
          {trip ? `1 open trip (${trip.name || "Untitled"})` : "No open trip"}
          {saved > 0 ? ` and ${saved} saved ${saved === 1 ? "trip" : "trips"}` : ""}, stored on this phone.
        </p>
        <Button variant="danger" block onClick={() => setConfirming(true)}>
          {what}
        </Button>
      </Card>

      <Sheet open={confirming} onClose={() => setConfirming(false)} title={guest ? "Delete your data?" : "Delete your account?"}>
        <div className="flex flex-col gap-3 pt-1">
          <p className="mb-2 leading-snug text-ink-2">
            This deletes {guest ? "your" : "your account details,"} trips, saved trips and settings from this phone and
            logs you out. It can&apos;t be undone.
          </p>
          <Button
            variant="danger"
            block
            onClick={() => {
              signOut({ erase: true });
              setConfirming(false);
              router.replace("/login");
            }}
          >
            {what}
          </Button>
          <Button variant="ghost" block onClick={() => setConfirming(false)}>
            {guest ? "Keep my data" : "Keep my account"}
          </Button>
        </div>
      </Sheet>
    </Group>
  );
}
