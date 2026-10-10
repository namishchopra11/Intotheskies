"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CONNECTION_BADGE,
  Field,
  FlightStatusBadge,
  Icon,
  PageHeader,
  ProgressBar,
  SelectField,
  Sheet,
  ThemeToggle,
  Toggle,
} from "@/components/ui";

export default function UiKit() {
  const [open, setOpen] = useState(false);
  const [refs, setRefs] = useState(false);
  const [stays, setStays] = useState(true);
  const [done, setDone] = useState(3);
  return (
    <main className="pb-10">
      <PageHeader eyebrow="Lisbon to Tokyo" title="Your flight is delayed" action={<ThemeToggle compact />}>
        Here&apos;s what changed and what to do next.
      </PageHeader>

      <div className="flex flex-col gap-4 px-4">
        <Card as="section">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-medium">
              <Icon name="plane" size={18} className="text-ink-3" />
              TP 1352 · LIS to FRA
            </p>
            <Badge tone="warn">45 min late</Badge>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-num text-[32px] leading-none font-semibold tabular-nums">11:20</span>
            <s className="font-num text-ink-3 tabular-nums">10:35</s>
            <span className="text-[14px] text-ink-3">arrives Frankfurt</span>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-control bg-warn-bg px-3 py-2.5 text-[15px] text-warn-fg">
            <Icon name="clock" size={18} strokeWidth={2} className="mt-0.5" />
            Connection to Tokyo is now 10 minutes. That&apos;s tight.
          </div>
        </Card>

        <Card>
          <p className="mb-2 text-[14px] font-medium text-ink-3">Status</p>
          <div className="flex flex-wrap gap-2">
            <FlightStatusBadge status="scheduled" />
            <FlightStatusBadge status="delayed" />
            <FlightStatusBadge status="cancelled" />
            <FlightStatusBadge status="rebooked" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["ok", "tight", "missed"] as const).map((k) => (
              <Badge key={k} tone={CONNECTION_BADGE[k].tone}>
                {CONNECTION_BADGE[k].label}
              </Badge>
            ))}
          </div>
        </Card>

        <Card>
          <ProgressBar label="Checklist" value={done} max={7} />
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => setDone((d) => Math.max(0, d - 1))}>
              Undo
            </Button>
            <Button size="sm" onClick={() => setDone((d) => Math.min(7, d + 1))}>
              Tick one
            </Button>
          </div>
        </Card>

        <Card className="divide-y divide-line py-1">
          <Toggle
            checked={refs}
            onChange={setRefs}
            label="Include booking references"
            description="Anyone with these can change your booking."
          />
          <Toggle checked={stays} onChange={setStays} label="Include hotel details" />
        </Card>

        <Card className="flex flex-col gap-4">
          <Field label="Flight number" placeholder="TP 1352" />
          <Field label="New arrival" type="datetime-local" defaultValue="2026-10-17T11:20" hint="Local time at the airport you land at." />
          <Field label="Airline" defaultValue="" error="Enter the airline name." />
          <SelectField
            label="What happened"
            options={[
              { value: "delay", label: "Delayed" },
              { value: "cancellation", label: "Cancelled" },
            ]}
          />
        </Card>

        <div className="flex flex-col gap-2">
          <Button variant="primary" block icon="share" onClick={() => setOpen(true)}>
            Share update
          </Button>
          <Button block icon="copy">
            Copy text
          </Button>
          <Button variant="ghost" block>
            Not now
          </Button>
          <Button variant="danger" block>
            Remove flight
          </Button>
        </div>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Share update"
        footer={
          <Button variant="primary" block onClick={() => setOpen(false)}>
            Done
          </Button>
        }
      >
        <p className="text-ink-2">A bottom sheet. Tap the dim area, press Escape, or use the close button.</p>
      </Sheet>
    </main>
  );
}
