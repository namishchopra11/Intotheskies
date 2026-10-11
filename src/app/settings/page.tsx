"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { initials } from "@/components/trip/ProfileButton";
import { SPEECH_VOICES } from "@/components/trip/speechVoices";
import { useRequireProfile } from "@/components/trip/useRequireProfile";
import { Button, Card, Field, PageHeader, PageTransition, SelectField, Sheet, ThemeToggle, Toggle } from "@/components/ui";
import { useTripStore } from "@/lib/store";
import { useTour } from "@/lib/tour";
import { SpeechVoiceSchema, TimeFormatSchema, type Profile, type ReminderPreferences } from "@/lib/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SettingsPage() {
  const ok = useRequireProfile();
  const profile = useTripStore((s) => s.profile);
  const router = useRouter();

  return (
    <PageTransition>
      <main className="flex flex-1 flex-col">
        <PageHeader variant="bar" title="Settings" />
        {ok && profile && (
          <div className="flex flex-col gap-7 px-4 pb-[max(env(safe-area-inset-bottom),28px)]">
            <Account profile={profile} />
            <AutoUpdates />
            <Notifications />
            <Reminders />
            <Group title="Trips">
              <Button variant="secondary" block icon="calendar" href="/trips">My trips & archive</Button>
            </Group>
            <Group title="Appearance">
              <div data-tour="appearance"><ThemeToggle /></div>
            </Group>
            <TimeDisplay />
            <ListenVoice />
            <Group title="Getting started">
              <Button variant="secondary" block onClick={() => {
                useTour.getState().start(profile, true);
                router.push("/");
              }}>Replay the quick tour</Button>
            </Group>
            <Demo />
            <YourData />
            <p className="px-1 text-[12px] text-ink-2">Trips stay on this phone. Imports are read by Claude.</p>
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
  // A guest's trips can't be put away for later, so logging out deletes them: ask first.
  const guestHasTrips = useTripStore((s) => profile.guest && (s.trip !== null || s.savedTrips.length > 0));
  const [confirmGuestLogout, setConfirmGuestLogout] = useState(false);
  const router = useRouter();
  const logOut = () => {
    signOut();
    router.replace("/login");
  };
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
              {profile.guest
                ? "Not signed in"
                : profile.provider === "google" || profile.provider === "apple"
                  ? `${profile.email} · via ${profile.provider === "google" ? "Google" : "Apple"} (demo)`
                  : profile.email}
            </span>
          </span>
        </div>

        {profile.guest ? (
          <Button
            variant="primary"
            block
            // Stays signed in as a guest until the new account exists, so the trip carries over.
            onClick={() => router.push("/login#create")}
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
          onClick={() => (guestHasTrips ? setConfirmGuestLogout(true) : logOut())}
        >
          Log out
        </Button>
      </Card>

      <Sheet open={confirmGuestLogout} onClose={() => setConfirmGuestLogout(false)} title="Log out of guest mode?">
        <div className="flex flex-col gap-3 pt-1">
          <p className="mb-2 leading-snug text-ink-2">Guest trips are deleted when you log out.</p>
          <Button
            variant="primary"
            block
            onClick={() => {
              setConfirmGuestLogout(false);
              router.push("/login#create");
            }}
          >
            Create an account
          </Button>
          <Button
            variant="danger"
            block
            onClick={() => {
              setConfirmGuestLogout(false);
              logOut();
            }}
          >
            Log out and delete
          </Button>
          <Button variant="ghost" block onClick={() => setConfirmGuestLogout(false)}>
            Stay logged in
          </Button>
        </div>
      </Sheet>
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
          description="New arrival time, hold the room."
        />
        <Toggle
          checked={settings.moveRides}
          onChange={(moveRides) => updateSettings({ moveRides })}
          label="Move my pickups"
          description="Match your new landing time."
        />
      </Card>
      <p className="px-1 text-[12px] text-ink-2">Simulated: nothing is really sent. Off means it goes on your to-do list.</p>
    </Group>
  );
}

/** One switch for flight-change alerts. Turning it on also asks for phone notifications. */
const REMINDER_OPTIONS: { key: keyof ReminderPreferences; label: string; description: string }[] = [
  { key: "documents", label: "Passport & entry rules", description: "Check your travel documents" },
  { key: "checkin", label: "Flight check-in", description: "Check in and save boarding passes" },
  { key: "connections", label: "Connection planning", description: "Prepare for short layovers" },
  { key: "arrival", label: "Hotel & pickup", description: "Confirm your arrival arrangements" },
  { key: "sharing", label: "Share your plans", description: "Keep someone in the loop" },
];

function Reminders() {
  const reminders = useTripStore((s) => s.settings.reminders);
  const updateSettings = useTripStore((s) => s.updateSettings);
  return (
    <Group title="Before you go reminders">
      <p className="px-1 text-[14px] text-ink-2">Choose what appears in your trip checklist. These are in-app reminders.</p>
      <Card className="flex flex-col divide-y divide-line-soft py-1">
        {REMINDER_OPTIONS.map(({ key, label, description }) => (
          <Toggle key={key} checked={reminders[key]} label={label} description={description}
            onChange={(checked) => updateSettings({ reminders: { ...reminders, [key]: checked } })} />
        ))}
      </Card>
    </Group>
  );
}

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
    ? "Off"
    : {
        granted: "App and phone",
        denied: "App only. Phone alerts blocked in browser.",
        default: "App only",
        unsupported: "App only",
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
            className="ck-rise mb-3"
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
    <Group title="Listen">
      <Card>
        <SelectField
          label="Voice"
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
              ? "Next button walks through the demo."
              : "Flights change on their own."
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
          <p className="mb-2 leading-snug text-ink-2">Deletes everything on this phone. Can&apos;t be undone.</p>
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

function TimeDisplay() {
  const timeFormat = useTripStore((s) => s.settings.timeFormat);
  const updateSettings = useTripStore((s) => s.updateSettings);
  return (
    <Group title="Time display">
      <Card>
        <SelectField label="Time format"
          value={timeFormat}
          onChange={(e) => {
            const next = TimeFormatSchema.safeParse(e.target.value);
            if (next.success) updateSettings({ timeFormat: next.data });
          }}
          options={[
            { value: "12h", label: "12-hour (2:25 PM)" },
            { value: "24h", label: "24-hour (14:25)" },
          ]}
        />
      </Card>
    </Group>
  );
}
