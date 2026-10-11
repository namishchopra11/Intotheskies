"use client";

import { useTimeFormat } from "@/lib/useTimeFormat";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card, Collapse, Field, Icon, PageHeader, Toggle, cx } from "@/components/ui";
import { sendUpdateTaskId } from "@/lib/domain/checklist";
import { encodeShare } from "@/lib/domain/shareLink";
import { DEFAULT_SUMMARY_OPTIONS, type SummaryOptions } from "@/lib/domain/summary";
import { useStoreReady, useTripStore } from "@/lib/store";
import { isDemoCluster, SOLANA_CLUSTER } from "@/lib/solana/config";
import { normalizeUsdcAmount } from "@/lib/solana/pay";
import { ShareSkeleton } from "../ShareSkeleton";
import { SendTo } from "./SendTo";
import { copyText } from "./copyText";
import { buildMessage, messageText } from "./message";

type Done = "shared" | "both" | "text" | "link" | "error";

// Read out by screen readers; the buttons themselves show the confirmation.
const ANNOUNCE: Record<Done, string> = {
  shared: "Update shared.",
  both: "Message and link copied. Paste them into any chat.",
  text: "Message copied. Paste it into any chat.",
  link: "Link copied. Paste it into any chat.",
  error: "Couldn't copy. Press and hold the message instead.",
};

function clockNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function SharePage() {
  const displayTime = useTimeFormat();
  const { id } = useParams<{ id: string }>();
  const ready = useStoreReady();
  const trip = useTripStore((s) => s.trip);
  const toggleTask = useTripStore((s) => s.toggleTask);
  const [options, setOptions] = useState<SummaryOptions>(DEFAULT_SUMMARY_OPTIONS);
  const [done, setDone] = useState<Done | null>(null);
  const [askFunds, setAskFunds] = useState(false);
  const [amount, setAmount] = useState("");
  const [openedAt] = useState(clockNow);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const disruption = trip?.disruptions.find((d) => d.id === id);
  const lines = useMemo(
    () => (trip && disruption ? buildMessage(trip, disruption.id, options).map((line) => ({ ...line, text: displayTime(line.text) })) : []),
    [trip, disruption, options, displayTime],
  );
  const message = messageText(lines);

  if (!ready) return <ShareSkeleton />;

  if (!trip || !disruption) {
    return (
      <main className="flex flex-1 flex-col">
        <PageHeader title="Nothing to share yet" />
        <div className="px-4 pt-2">
          <Card className="text-ink-2">
            This update isn&apos;t on this phone.
            <Button href="/" variant="primary" block chip="arrow-right" className="mt-4">
              Go to your trip
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  // The optional "Send help" request only goes in the link when there is an address and a valid amount.
  const fundsOn = askFunds && Boolean(trip.payoutAddress);
  const amountOk = normalizeUsdcAmount(amount) !== null;
  const amountError =
    fundsOn && amount.trim() !== "" && !amountOk ? "Enter an amount like 50 or 85.50." : undefined;
  const link = () =>
    `${window.location.origin}/s#${encodeShare(trip, disruption.id, {
      ...options,
      fundsRequest: fundsOn && amountOk ? { amountUsdc: amount } : null,
    })}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  // Sharing or copying the update is the "send an update" task, so tick it off for them.
  // Read the live store: toggleTask flips the state, so it must only run while still open.
  const markSent = () => {
    const current = useTripStore.getState().trip?.disruptions.find((d) => d.id === disruption.id);
    const task = current?.tasks.find((t) => t.id === sendUpdateTaskId(disruption.id));
    if (task && !task.done) toggleTask(disruption.id, task.id);
  };

  const confirm = (d: Done) => {
    if (d !== "error") markSent();
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
      await navigator.share({ title: trip.travelerName.trim() ? `Update from ${trip.travelerName}` : "Travel update", text: message, url: link() });
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
      <PageHeader title="Share update" />

      <SendTo trip={trip} disruptionId={disruption.id} />

      <section aria-label="Message preview" className="flex flex-col gap-2 px-4 pt-[22px]">
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
            description="Anyone with these can change your booking."
          />
          <Toggle checked={options.includeStays} onChange={set("includeStays")} label="Hotel details" />
          <Toggle
            checked={options.includeOpenTasks}
            onChange={set("includeOpenTasks")}
            label="Open tasks"
          />
        </Card>
      </section>

      <section aria-labelledby="funds-h" className="mx-4 mt-[22px]">
        <h2 id="funds-h" className="ck-label mb-2 px-1">
          Ask for help
        </h2>
        <Card padding="none" className="px-4">
          <Toggle
            checked={fundsOn}
            onChange={(v) => {
              setAskFunds(v);
              setDone(null);
            }}
            disabled={!trip.payoutAddress}
            label="Add a Send help button"
            description={
              trip.payoutAddress
                ? "USDC on devnet (test network)."
                : "Add a Solana address in the trip menu first."
            }
          />
          <Collapse open={fundsOn}>
            <Field
              className="pb-3"
              label="Amount in USDC"
              hint={
                isDemoCluster(SOLANA_CLUSTER)
                  ? "Test network. No real money."
                  : undefined
              }
              inputMode="decimal"
              placeholder="50"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setDone(null);
              }}
              error={amountError}
            />
          </Collapse>
        </Card>
        <Collapse open={fundsOn}>
          <p className="mt-2 flex items-start gap-2 px-1 text-[14px] leading-snug text-ink-2">
            <Icon name="info" size={18} className="mt-px" />
            <span>
              {amountOk
                ? "Link only. Your address and trip name are public on the blockchain."
                : "Add an amount to show the button."}
            </span>
          </p>
        </Collapse>
      </section>

      <div className="mt-auto flex flex-col gap-3 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),26px)]">
        <p className="mx-1 mb-1 text-[12px] text-ink-2">Link is a snapshot from {displayTime(openedAt)}.</p>
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
