"use client";
import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import { CircleCheck, FileUp, Trash2 } from "lucide-react";
import { mergeImportedInventory, parseOperatorCsv, sampleOperatorCsv, sampleOperatorCsvWithErrors } from "@/lib/jetflex/csvImport";
import type { Overrides } from "@/lib/jetflex/inventory";
import type { ImportedInventory, SchedFlight } from "@/lib/jetflex/types";
import { Badge, Button, Card, Notice } from "./ui";

const MAX_BYTES = 400_000;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/**
 * Operator CSV import: paste or upload, see every row's verdict and the legs it would add, then apply
 * explicitly. Applying saves the accepted rows in this browser so Plan a Trip searches them too.
 */
export function OperatorImport({ today, overrides, custom, imported, onApply, onClear }: {
  today: string;
  overrides: Overrides;
  custom: SchedFlight[];
  imported: ImportedInventory | null;
  onApply: (inv: ImportedInventory) => void;
  onClear: () => void;
}) {
  const areaId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  const result = useMemo(() => (text.trim() ? parseOperatorCsv(text, { today }) : null), [text, today]);
  const merge = useMemo(() => (result && result.inventory.rows.length ? mergeImportedInventory(today, result.inventory, { overrides, custom }) : null), [result, today, overrides, custom]);
  const accepted = result?.inventory.rows.length ?? 0;

  const load = (csv: string, note: string | null = null) => { setText(csv); setFileNote(note); setApplied(null); };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) { load("", `${f.name} is ${Math.round(f.size / 1000)} KB. The demo reads files up to ${MAX_BYTES / 1000} KB.`); return; }
    try {
      load(await f.text(), `Loaded ${f.name}.`);
    } catch {
      load("", `Could not read ${f.name}. Paste the CSV text below instead.`);
    }
  };
  const apply = () => {
    if (!result || !accepted) return;
    onApply(result.inventory);
    setApplied(`Applied ${plural(accepted, "row")}. ${merge?.summary.headline ?? ""}.`);
  };
  const clear = () => { onClear(); setApplied(null); load(""); if (fileRef.current) fileRef.current.value = ""; };

  return (
    <section className="mb-10" aria-labelledby="import-h">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="import-h" className="display text-2xl">Import operator CSV</h2>
          <p className="mt-1 max-w-2xl text-sm text-steel">Paste or upload your aircraft and flights. Booked flights fill the schedule, so gaps between them are detected as empty legs; rows marked empty become offers at your own price. The file is read in this browser and never uploaded.</p>
        </div>
      </div>

      <Card className="space-y-5 p-5 sm:p-6">
        {imported && (
          <Notice tone="ok">
            <CircleCheck size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span className="min-w-0">
              <strong>Imported inventory is active:</strong> {plural(imported.rows.length, "row")}, {imported.fleet.length} new aircraft, {plural(imported.offered.length, "listed empty leg")}. Travelers searching on <Link href="/jetflex/plan" className="underline underline-offset-2">Plan a Trip</Link> see these legs.
            </span>
          </Notice>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => load(sampleOperatorCsv(today))}>Load sample CSV</Button>
          <Button size="sm" onClick={() => load(sampleOperatorCsvWithErrors(today))}>Load sample with errors</Button>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-1.5 text-sm sm:min-h-9 text-warm transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-gold hover:border-steel hover:bg-panel-2">
            <FileUp size={15} aria-hidden />Choose a file
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => { const el = e.target; void onFile(el.files?.[0]).then(() => { el.value = ""; }); }} />
          </label>
        </div>
        {fileNote && <p className="text-xs text-steel" role="status">{fileNote}</p>}

        <div className="flex flex-col gap-1.5">
          <label htmlFor={areaId} className="text-xs font-medium uppercase tracking-[0.08em] text-steel">CSV text</label>
          <textarea id={areaId} value={text} onChange={(e) => load(e.target.value)} rows={7} spellCheck={false} wrap="off"
            placeholder="tail,aircraft,origin,destination,departure_local,arrival_local,seats,price,status"
            className="num w-full resize-y rounded-xl border border-line bg-deep px-3 py-2.5 text-xs leading-relaxed text-warm placeholder:text-steel/70 focus:border-gold focus:outline-none" />
          <p className="text-xs text-steel">Columns: tail, aircraft, origin, destination, departure_local and arrival_local (YYYY-MM-DD HH:mm, local to each airport), then optional seats, price and status (booked, empty, limited, unavailable).</p>
        </div>

        {result && (
          <div className="space-y-4" aria-live="polite">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><dt className="text-xs uppercase tracking-[0.1em] text-steel">Rows read</dt><dd className="num mt-1 text-xl text-warm">{result.summary.rows}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.1em] text-steel">Accepted</dt><dd className="num mt-1 text-xl text-ok">{result.summary.accepted}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.1em] text-steel">Rejected</dt><dd className={`num mt-1 text-xl ${result.summary.rejected ? "text-bad" : "text-warm"}`}>{result.summary.rejected}</dd></div>
              <div><dt className="text-xs uppercase tracking-[0.1em] text-steel">New legs</dt><dd className="num mt-1 text-xl text-gold">{merge?.summary.added ?? 0}</dd></div>
            </dl>
            <p className="text-sm text-steel">{result.summary.headline}</p>
            {merge && <p className="text-sm text-steel"><span className="text-warm">If applied:</span> {merge.summary.headline}.</p>}

            {result.issues.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-gold">Row by row ({result.issues.length})</h3>
                <ul className="max-h-72 divide-y divide-line/60 overflow-y-auto rounded-xl border border-line text-sm">
                  {result.issues.map((i, n) => (
                    <li key={n} className="flex items-start gap-3 px-3 py-2">
                      <span className="num w-14 shrink-0 pt-0.5 text-xs text-steel">Line {i.line}</span>
                      <span className="min-w-0 flex-1"><span className="block text-warm">{i.message}</span>{(i.field || i.tail) && <span className="num block text-xs text-steel">{[i.tail, i.field && `field: ${i.field}`].filter(Boolean).join(" · ")}</span>}</span>
                      <Badge tone={i.severity === "error" ? "bad" : "warn"}>{i.severity === "error" ? "Rejected" : "Warning"}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <p className="flex items-center gap-2 text-sm text-ok"><CircleCheck size={15} aria-hidden />Every row passed validation.</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Button variant="primary" onClick={apply} disabled={!accepted}>{accepted ? `Apply ${plural(accepted, "accepted row")}` : "Apply import"}</Button>
          <Button variant="danger" onClick={clear} disabled={!imported && !text}><Trash2 size={15} aria-hidden />Clear imported data</Button>
          <span className="text-xs text-steel">Applying replaces any earlier import. Nothing changes until you apply.</span>
        </div>
        {applied && <Notice tone="ok"><CircleCheck size={15} className="mt-0.5 shrink-0" aria-hidden /><span>{applied}</span></Notice>}
        <p className="text-[11px] leading-snug text-steel">Simulated: imported aircraft and flights are illustrative, are stored only in this browser and are not shared with any real operator or traveler.</p>
      </Card>
    </section>
  );
}
