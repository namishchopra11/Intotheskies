"use client";

import { useTimeFormat } from "@/lib/useTimeFormat";
import { useRef, useState } from "react";
import { Button, Icon, Sheet, TextAreaField, cx, type IconName } from "@/components/ui";
import { formatDateTime } from "@/lib/domain/time";
import { newId } from "@/lib/id";
import { useTripStore } from "@/lib/store";
import { ImportResultSchema, existingIdFor, toImportItems, type ImportItem } from "./importSchema";
import { BoardingPassCamera } from "./BoardingPassCamera";

const ICON: Record<ImportItem["kind"], IconName> = { flight: "plane", stay: "bed", ride: "car", skipped: "circle-alert" };
const MAX_SIDE = 2000;

/** Photos straight off a phone camera are huge; shrink them before upload. Falls back to the original. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 3_000_000 && file.type !== "image/heic") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

type Phase =
  | { step: "input"; error?: string }
  | { step: "reading" }
  | { step: "review"; items: ImportItem[]; notes: string[]; tripName: string | null; travelerName: string | null };

/** Upload a screenshot, PDF or email; Claude reads it; the traveler picks what to add. */
export function ImportSheet({ onClose }: { onClose: () => void }) {
  const displayTime = useTimeFormat();
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>({ step: "input" });
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const input = useRef<HTMLInputElement>(null);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const dragDepth = useRef(0);
  const [cameraOpen, setCameraOpen] = useState(false);

  const chooseFiles = (chosen: File[]) => {
    if (phase.step !== "input") return;
    const supported = chosen.filter((f) => f.type.startsWith("image/") || f.type === "application/pdf" || f.type.startsWith("text/") || /\.(pdf|eml|txt)$/i.test(f.name));
    const room = Math.max(0, 6 - files.length);
    const accepted = supported.slice(0, room).map((f) => {
      // Some dragged files have no MIME type; infer the supported document types.
      if (f.type) return f;
      const type = /\.pdf$/i.test(f.name) ? "application/pdf" : /\.txt$/i.test(f.name) ? "text/plain" : "";
      return type ? new File([f], f.name, { type, lastModified: f.lastModified }) : f;
    });
    setFiles((current) => [...current, ...accepted]);
    const error = supported.length !== chosen.length
      ? "Use screenshots, photos, PDFs or email text files."
      : supported.length > room ? "You can add up to 6 files at a time." : undefined;
    setPhase({ step: "input", error });
  };

  const read = async () => {
    setPhase({ step: "reading" });
    try {
      const body = new FormData();
      for (const f of await Promise.all(files.map(shrink))) body.append("files", f);
      if (text.trim()) body.append("text", text);
      const res = await fetch("/api/import", { method: "POST", body });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message = (data as { error?: string } | null)?.error;
        return setPhase({ step: "input", error: message ?? "Reading failed. Try again." });
      }
      const result = ImportResultSchema.safeParse(data);
      if (!result.success) return setPhase({ step: "input", error: "Reading failed. Try again." });
      const items = toImportItems(result.data, newId);
      setPicked(new Set(items.flatMap((it, i) => (it.kind === "skipped" ? [] : [i]))));
      const { notes, tripName, travelerName } = result.data;
      setPhase({ step: "review", items, notes, tripName, travelerName });
    } catch {
      setPhase({ step: "input", error: "Couldn't reach the server. Check your connection and try again." });
    }
  };

  const add = () => {
    if (phase.step !== "review") return;
    const store = useTripStore.getState();
    if (!store.trip) {
      store.startTrip({ name: phase.tripName ?? "My trip", travelerName: phase.travelerName ?? "" });
    }
    phase.items.forEach((entry, i) => {
      if (!picked.has(i) || entry.kind === "skipped") return;
      const trip = useTripStore.getState().trip;
      const id = existingIdFor(trip, entry) ?? entry.item.id;
      if (entry.kind === "flight") store.upsertFlight({ ...entry.item, id });
      if (entry.kind === "stay") store.upsertStay({ ...entry.item, id });
      if (entry.kind === "ride") store.upsertRide({ ...entry.item, id });
    });
    onClose();
  };

  if (cameraOpen) {
    return <Sheet open onClose={onClose} title="Photograph your boarding pass">
      <BoardingPassCamera onClose={() => setCameraOpen(false)} onCapture={(file) => {
        chooseFiles([file]);
        setCameraOpen(false);
      }} />
    </Sheet>;
  }

  if (phase.step === "review") {
    const count = picked.size;
    return (
      <Sheet
        open
        onClose={onClose}
        title={phase.items.length ? "Here's what we found" : "Nothing to add"}
        footer={
          <Button variant="primary" block disabled={count === 0} onClick={add}>
            {count === 0 ? "Nothing selected" : `Add ${count} ${count === 1 ? "booking" : "bookings"}`}
          </Button>
        }
      >
        <div className="flex flex-col gap-4 pt-1">
          {phase.items.length > 0 && (
            <ul className="flex flex-col divide-y divide-line-soft overflow-hidden rounded-card border border-line">
              {phase.items.map((entry, i) => (
                <li key={i}>
                  <label className={cx("flex items-start gap-3 px-4 py-3.5", entry.kind !== "skipped" && "cursor-pointer")}>
                    <span aria-hidden="true" className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-sunk">
                      <Icon name={ICON[entry.kind]} size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{entry.label}</span>
                      <span className="block text-[14px] text-ink-2">
                        {entry.kind === "skipped" ? `${entry.reason} Add it by hand.` : displayTime(summary(entry))}
                      </span>
                    </span>
                    {entry.kind !== "skipped" && (
                      <input
                        type="checkbox"
                        className="mt-2 size-5 accent-[var(--accent)]"
                        checked={picked.has(i)}
                        onChange={(e) =>
                          setPicked((p) => {
                            const next = new Set(p);
                            if (e.target.checked) next.add(i);
                            else next.delete(i);
                            return next;
                          })
                        }
                      />
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
          {phase.notes.length > 0 && (
            <div className="rounded-card bg-sunk p-4 text-[14px] leading-snug text-ink-2">
              <p className="mb-1 font-semibold text-ink">Worth checking</p>
              <ul className="list-disc pl-5">
                {phase.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[14px] text-ink-2">You can edit anything after it&apos;s added.</p>
        </div>
      </Sheet>
    );
  }

  const reading = phase.step === "reading";
  return (
    <Sheet
      open
      onClose={onClose}
      title="Import from a confirmation"
      footer={
        <Button variant="primary" block disabled={reading || (files.length === 0 && !text.trim())} onClick={read}>
          {reading ? "Reading…" : "Read it"}
        </Button>
      }
    >
      <div className="flex flex-col gap-4 pt-1" aria-busy={reading}>
        <p className="leading-snug text-ink-2">Screenshot, PDF or email.</p>

        <input
          ref={input}
          type="file"
          accept="image/*,application/pdf,.eml,text/plain"
          multiple
          hidden
          onChange={(e) => {
            const chosen = Array.from(e.target.files ?? []);
            chooseFiles(chosen);
            e.target.value = "";
          }}
        />
        <Button variant="secondary" block icon="camera" disabled={reading || files.length >= 6} onClick={() => setCameraOpen(true)}>
          Photograph a boarding pass
        </Button>
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            if (reading || !e.dataTransfer.types.includes("Files")) return;
            dragDepth.current += 1;
            setDraggingFiles(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = reading ? "none" : "copy";
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDraggingFiles(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            dragDepth.current = 0;
            setDraggingFiles(false);
            if (!reading) chooseFiles(Array.from(e.dataTransfer.files));
          }}
          className={cx("rounded-card border-2 border-dashed p-5 text-center transition-colors", draggingFiles ? "border-ink bg-sunk" : "border-line bg-surface")}
        >
          <span aria-hidden="true" className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-control bg-sunk">
            <Icon name="plus" size={22} />
          </span>
          <p className="mb-1 font-semibold">{draggingFiles ? "Drop your confirmations here" : "Drag and drop your confirmations"}</p>
          <p className="mb-4 text-[13px] text-ink-2">Screenshots, photos, PDFs or email files · Up to 6 files</p>
          <Button variant="secondary" block disabled={reading} onClick={() => input.current?.click()}>
            Choose files
          </Button>
        </div>
        {files.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-2 rounded-control bg-sunk py-1 pr-1 pl-3 text-[14px]">
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  disabled={reading}
                  onClick={() => setFiles((all) => all.filter((_, j) => j !== i))}
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-control text-ink-2 hover:text-ink"
                >
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <TextAreaField
          label="Or paste the email"
          rows={5}
          placeholder="Paste the confirmation email here"
          value={text}
          disabled={reading}
          onChange={(e) => setText(e.target.value)}
        />

        {phase.step === "input" && phase.error && (
          <p role="alert" className="flex items-start gap-1.5 text-[14px] text-bad-fg">
            <Icon name="circle-x" size={16} className="mt-0.5" />
            {phase.error}
          </p>
        )}

        <p className="flex items-start gap-2 text-[13px] leading-snug text-ink-2">
          <Icon name="lock" size={16} className="mt-px" />
          Read by Claude (Anthropic). Not kept.
        </p>
      </div>
    </Sheet>
  );
}

function summary(entry: Exclude<ImportItem, { kind: "skipped" }>): string {
  const t = formatDateTime;
  switch (entry.kind) {
    case "flight":
      return `${entry.item.airline} · ${t(entry.item.departAt)} → ${t(entry.item.arriveAt)}`;
    case "stay":
      return `${t(entry.item.checkIn)} → ${t(entry.item.checkOut)}`;
    case "ride":
      return `Pickup ${t(entry.item.pickupAt)}`;
  }
}
