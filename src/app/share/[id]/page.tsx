"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card, Icon, PageHeader, Toggle, cx } from "@/components/ui";
import { encodeShare } from "@/lib/domain/shareLink";
import { buildSummary, DEFAULT_SUMMARY_OPTIONS, type SummaryOptions } from "@/lib/domain/summary";
import { useStoreReady, useTripStore } from "@/lib/store";
import { ShareSkeleton } from "../ShareSkeleton";
import { copyText } from "./copyText";

type Done = "shared" | "text" | "link" | "error";

const CONFIRM: Record<Done, string> = {
  shared: "Update shared",
  text: "Message copied. Paste it into any chat.",
  link: "Link copied. Paste it into any chat.",
  error: "Couldn't copy on this device. Press and hold the message to copy it.",
};

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const ready = useStoreReady();
  const trip = useTripStore((s) => s.trip);
  const [options, setOptions] = useState<SummaryOptions>(DEFAULT_SUMMARY_OPTIONS);
  const [done, setDone] = useState<Done | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const disruption = trip?.disruptions.find((d) => d.id === id);
  const summary = useMemo(
    () => (trip && disruption ? buildSummary(trip, disruption.id, options) : ""),
    [trip, disruption, options],
  );

  if (!ready) return <ShareSkeleton />;

  if (!trip || !disruption) {
    return (
      <main className="flex flex-1 flex-col">
        <PageHeader title="Nothing to share yet" back={{ href: "/", label: "Your trip" }} />
        <div className="px-4">
          <Card className="text-ink-2">
            This update isn&apos;t on this phone. Report what changed on your trip first, then
            share it from there.
            <Button href="/" variant="primary" block className="mt-4">
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
    timer.current = setTimeout(() => setDone(null), 2600);
  };
  const set = (key: keyof SummaryOptions) => (value: boolean) => {
    setOptions((o) => ({ ...o, [key]: value }));
    setDone(null);
  };

  const onShare = async () => {
    try {
      await navigator.share({ title: `Update from ${trip.travelerName}`, text: summary, url: link() });
      confirm("shared");
    } catch (e) {
      // Closing the share sheet is not an error.
      if ((e as Error)?.name !== "AbortError") confirm((await copyText(summary)) ? "text" : "error");
    }
  };
  const onCopyText = async () => confirm((await copyText(summary)) ? "text" : "error");
  const onCopyLink = async () => confirm((await copyText(link())) ? "link" : "error");

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        eyebrow={trip.name}
        title="Share an update"
        back={{ href: `/disruption/${disruption.id}`, label: "Back" }}
      >
        Let the people waiting for you know what changed.
      </PageHeader>

      <div className="flex flex-1 flex-col gap-5 px-4 pb-6">
        <section aria-labelledby="preview-h">
          <h2 id="preview-h" className="mb-2 text-[14px] font-semibold text-ink-3">
            Preview
          </h2>
          <div className="rounded-card bg-sunk px-3 py-4">
            <div className="ml-auto w-fit max-w-[92%] rounded-[20px] rounded-br-md border border-line bg-surface px-4 py-3 shadow-sm">
              <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap text-ink">
                {summary}
              </p>
            </div>
            <p className="mt-2 flex items-center justify-end gap-1 pr-1 text-[13px] text-ink-3">
              <Icon name="link" size={14} />
              Share also adds a link to the full update
            </p>
          </div>
        </section>

        <section aria-labelledby="include-h">
          <h2 id="include-h" className="mb-2 text-[14px] font-semibold text-ink-3">
            Include
          </h2>
          <Card className="divide-y divide-line py-1">
            <Toggle
              checked={options.includeBookingRefs}
              onChange={set("includeBookingRefs")}
              label="Booking references"
              description="Off is safer. Anyone with these can change or cancel your booking."
            />
            <Toggle
              checked={options.includeStays}
              onChange={set("includeStays")}
              label="Hotel details"
              description="Where you're staying and when you'll check in."
            />
            <Toggle
              checked={options.includeOpenTasks}
              onChange={set("includeOpenTasks")}
              label="What's still unresolved"
              description="Things on your checklist you haven't sorted yet."
            />
          </Card>
          {options.includeBookingRefs && (
            <p className="mt-2 flex items-start gap-2 rounded-control bg-warn-bg px-3 py-2.5 text-[14px] text-warn-fg">
              <Icon name="lock" size={18} className="mt-px" />
              Only send booking references to people you trust.
            </p>
          )}
        </section>

        <p className="flex items-start gap-2.5 text-[14px] leading-snug text-ink-2">
          <Icon name="clock" size={18} className="mt-px text-ink-3" />
          <span>
            The link is a snapshot of right now. It won&apos;t update on its own, so share a new
            one if your plans change again.
          </span>
        </p>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-line bg-bg px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <p
          role="status"
          aria-live="polite"
          className={cx(
            "pointer-events-none absolute inset-x-4 bottom-full mb-2 flex justify-center transition-[opacity,transform] duration-200",
            done ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          )}
        >
          {done && (
            <span
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] font-medium shadow-md",
                done === "error" ? "bg-bad-bg text-bad-fg" : "bg-ok-bg text-ok-fg",
              )}
            >
              <Icon name={done === "error" ? "circle-x" : "circle-check"} size={16} strokeWidth={2} />
              {CONFIRM[done]}
            </span>
          )}
        </p>
        {canShare && (
          <Button variant="primary" block icon={done === "shared" ? "check" : "share"} onClick={onShare}>
            {done === "shared" ? "Shared" : "Share"}
          </Button>
        )}
        <div className={cx("grid grid-cols-2 gap-2", canShare && "mt-2")}>
          <Button
            variant={canShare ? "secondary" : "primary"}
            icon={done === "text" ? "check" : "copy"}
            onClick={onCopyText}
          >
            {done === "text" ? "Copied" : "Copy text"}
          </Button>
          <Button icon={done === "link" ? "check" : "link"} onClick={onCopyLink}>
            {done === "link" ? "Copied" : "Copy link"}
          </Button>
        </div>
      </div>
    </main>
  );
}
