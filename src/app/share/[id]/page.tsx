"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card, Icon, PageHeader, Toggle, cx } from "@/components/ui";
import { encodeShare } from "@/lib/domain/shareLink";
import { DEFAULT_SUMMARY_OPTIONS, type SummaryOptions } from "@/lib/domain/summary";
import { useStoreReady, useTripStore } from "@/lib/store";
import { ShareSkeleton } from "../ShareSkeleton";
import { copyText } from "./copyText";
import { buildMessage, messageText } from "./message";

type Done = "shared" | "both" | "text" | "link" | "error";

// Read out by screen readers; the buttons themselves show the confirmation.
const ANNOUNCE: Record<Done, string> = {
  shared: "Update shared.",
  both: "Message and link copied. Paste them into any chat.",
  text: "Message copied. Paste it into any chat.",
  link: "Link copied. Paste it into any chat.",
  error: "Couldn't copy on this device. Press and hold the message to copy it.",
};

function clockNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const ready = useStoreReady();
  const trip = useTripStore((s) => s.trip);
  const [options, setOptions] = useState<SummaryOptions>(DEFAULT_SUMMARY_OPTIONS);
  const [done, setDone] = useState<Done | null>(null);
  const [openedAt] = useState(clockNow);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const disruption = trip?.disruptions.find((d) => d.id === id);
  const lines = useMemo(
    () => (trip && disruption ? buildMessage(trip, disruption.id, options) : []),
    [trip, disruption, options],
  );
  const message = messageText(lines);

  if (!ready) return <ShareSkeleton />;

  if (!trip || !disruption) {
    return (
      <main className="flex flex-1 flex-col">
        <PageHeader variant="bar" title="Nothing to share yet" back={{ href: "/", label: "Back to trip" }} />
        <div className="px-4 pt-2">
          <Card className="text-ink-2">
            This update isn&apos;t on this phone. Report what changed on your trip first, then
            share it from there.
            <Button href="/" variant="primary" block chip="arrow-right" className="mt-4">
              Go to your trip
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  const link = () => `${window.location.origin}/s#${encodeShare(trip, disruption.id, options)}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const confirm = (d: Done) => {
    setDone(d);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(null), 1800);
  };
  const set = (key: keyof SummaryOptions) => (value: boolean) => setOptions((o) => ({ ...o, [key]: value }));

  const onShare = async () => {
    if (!canShare) {
      confirm((await copyText(`${message}\n\n${link()}`)) ? "both" : "error");
      return;
    }
    try {
      await navigator.share({ title: `Update from ${trip.travelerName}`, text: message, url: link() });
      confirm("shared");
    } catch (e) {
      // Closing the share sheet is not an error.
      if ((e as Error)?.name !== "AbortError") confirm((await copyText(message)) ? "text" : "error");
    }
  };
  const onCopyText = async () => confirm((await copyText(message)) ? "text" : "error");
  const onCopyLink = async () => confirm((await copyText(link())) ? "link" : "error");

  const mainDone = done === "shared" || done === "both";

  return (
    <main className="ck-screen-in flex flex-1 flex-col">
      <PageHeader variant="bar" title="Share the new plan" back={{ href: "/", label: "Back to trip" }} />

      <section aria-label="Message preview" className="flex flex-col gap-2 px-4 pt-2">
        <span className="ck-label px-1">Preview</span>
        <div
          aria-live="polite"
          className="ck-rise flex max-w-[320px] flex-col gap-2 self-end rounded-[16px] rounded-br-[4px] bg-bubble px-4 py-3.5 text-[15px] leading-[1.45] text-on-bubble"
          style={{ animationDelay: "80ms" }}
        >
          {lines.map((line) => (
            <div key={line.key} className="ck-line" data-off={!line.on} aria-hidden={!line.on || undefined}>
              <p className={cx("break-words", line.mono && "font-num text-[14px]")}>{line.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="What to include" className="mx-4 mt-[22px]">
        <Card padding="none" className="divide-y divide-line-soft px-4">
          <Toggle
            checked={options.includeBookingRefs}
            onChange={set("includeBookingRefs")}
            label="Booking references"
            description="Off by default. Anyone with these can change your booking."
          />
          <Toggle checked={options.includeStays} onChange={set("includeStays")} label="Hotel details" />
          <Toggle
            checked={options.includeOpenTasks}
            onChange={set("includeOpenTasks")}
            label="What's still unresolved"
          />
        </Card>
      </section>

      <div className="mt-auto flex flex-col gap-3 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),26px)]">
        <p className="mx-1 mb-1.5 flex items-start gap-2 text-[13px] leading-[1.4] text-ink-2">
          <Icon name="circle-alert" size={16} className="mt-px" />
          The link is a snapshot from {openedAt}. It won&apos;t update on its own.
        </p>
        <p role="status" aria-live="polite" className="sr-only">
          {done ? ANNOUNCE[done] : ""}
        </p>
        {done === "error" && (
          <p className="ck-rise flex items-start gap-2 rounded-card bg-bad-bg px-3 py-2.5 text-[14px] text-bad-fg">
            <Icon name="circle-x" size={18} className="mt-px" />
            {ANNOUNCE.error}
          </p>
        )}
        <Button variant="primary" size="lg" block chip={mainDone ? "check" : "share"} onClick={onShare}>
          {done === "shared" ? "Shared" : done === "both" ? "Copied" : "Share"}
        </Button>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            variant={done === "text" ? "success" : "secondary"}
            icon={done === "text" ? "check" : "copy"}
            drawIcon={done === "text"}
            onClick={onCopyText}
          >
            {done === "text" ? "Text copied" : "Copy text"}
          </Button>
          <Button
            variant={done === "link" ? "success" : "secondary"}
            icon={done === "link" ? "check" : "link"}
            drawIcon={done === "link"}
            onClick={onCopyLink}
          >
            {done === "link" ? "Link copied" : "Copy link"}
          </Button>
        </div>
      </div>
    </main>
  );
}
