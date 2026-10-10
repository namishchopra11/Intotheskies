"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Copy, Download, TriangleAlert } from "lucide-react";
import type { Itinerary } from "@/lib/jetflex/types";
import { buildBrief, DIETS, DRINKS, type CabinProfile } from "@/lib/jetflex/cabin";
import { useJet, useJetReady } from "@/lib/jetflex/store";
import { Badge, Button, Card, cx, EmptyState, Field, Input, Notice, PageHeader, Segmented, Select, Skeleton, Toggle } from "./ui";

const Chips = ({ options, value, onChange, label }: { options: string[]; value: string[]; onChange: (v: string[]) => void; label: string }) => (
  <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
    {options.map((o) => {
      const on = value.includes(o);
      return <button key={o} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])} className={cx("rounded-full border px-3 py-1 text-xs transition-colors", on ? "border-gold bg-gold/15 text-gold" : "border-line text-steel hover:text-warm")}>{o}</button>;
    })}
  </div>
);
const Area = ({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) => (
  <textarea id={id} rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full resize-none rounded-xl border border-line bg-deep px-3 py-2.5 text-sm placeholder:text-steel/70 focus:border-gold focus:outline-none" />
);

export function CabinPage() {
  const ready = useJetReady();
  const stored = useJet((s) => s.cabin);
  const setCabin = useJet((s) => s.setCabin);
  const active = useJet((s) => s.active);
  const saved = useJet((s) => s.saved);
  const [draft, setDraft] = useState<CabinProfile | null>(null);
  const p = draft ?? stored;
  const dirty = draft !== null;
  const [justSaved, setJustSaved] = useState(false);
  const [pickId, setPickId] = useState<string>("");
  const [madeFor, setMadeFor] = useState("");
  const [copied, setCopied] = useState(false);
  const upd = (patch: Partial<CabinProfile>) => { setDraft({ ...p, ...patch }); setJustSaved(false); };
  const persist = () => { setCabin(p); setDraft(null); setJustSaved(true); };

  const cands = useMemo(() => { const m = new Map<string, Itinerary>(); [active, ...saved.map((s) => s.itinerary)].forEach((i) => i && m.set(i.id, i)); return [...m.values()]; }, [active, saved]);
  const it = cands.find((c) => c.id === pickId) ?? cands[0];
  const brief = useMemo(() => (it ? buildBrief(p, it) : null), [p, it]);
  const made = Boolean(it) && madeFor === it?.id;

  const copy = async () => {
    if (!brief) return;
    try { await navigator.clipboard.writeText(brief.text); } catch { const t = document.createElement("textarea"); t.value = brief.text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };
  const download = () => { if (!brief) return; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([brief.text], { type: "text/plain" })); a.download = "jetflex-cabin-brief.txt"; a.click(); URL.revokeObjectURL(a.href); };

  if (!ready) return <Skeleton className="h-96" />;
  return (
    <>
      <PageHeader eyebrow="My cabin" title={<>Travel that already <span className="text-gold">knows you.</span></>}>Save how you like to fly once. JetFlex turns it into a service brief for the operator of any private option you choose, and flags what the aircraft may not support.</PageHeader>
      <div className="grid gap-8 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-5 p-5 sm:p-6">
          <div className="flex items-center justify-between"><h2 className="display text-xl">Preferences</h2>{dirty ? <Badge tone="warn">Unsaved changes</Badge> : justSaved ? <Badge tone="ok"><Check size={11} />Saved on this device</Badge> : <Badge>Saved</Badge>}</div>
          <Field label="Traveler name">{(id) => <Input id={id} value={p.name} onChange={(e) => upd({ name: e.target.value })} placeholder="As it should appear on the brief" />}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Cabin temperature · ${p.tempF}°F`}>{(id) => <input id={id} type="range" min={62} max={78} value={p.tempF} onChange={(e) => upd({ tempF: Number(e.target.value) })} />}</Field>
            <Field label="Luggage (bags)">{(id) => <Input id={id} type="number" min={0} max={40} value={p.bags} onChange={(e) => upd({ bags: Math.max(0, Math.min(40, Number(e.target.value) || 0)) })} />}</Field>
          </div>
          <Field label="Dietary requirements">{() => <Chips label="Dietary requirements" options={DIETS} value={p.diet} onChange={(diet) => upd({ diet })} />}</Field>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-sm"><span>Prefer a hot meal service</span><Toggle label="Hot meal service" checked={p.hotMeals} onChange={(hotMeals) => upd({ hotMeals })} /></div>
          <Field label="Meal notes">{(id) => <Area id={id} value={p.mealNotes} onChange={(mealNotes) => upd({ mealNotes })} placeholder="Light breakfast, no peanuts in the galley…" />}</Field>
          <Field label="Preferred drinks">{() => <Chips label="Preferred drinks" options={DRINKS} value={p.drinks} onChange={(drinks) => upd({ drinks })} />}</Field>
          <Field label="Workspace">{() => <Segmented label="Workspace" value={p.workspace} onChange={(workspace) => upd({ workspace })} options={[{ value: "quiet", label: "Quiet focus" }, { value: "collab", label: "Collaborative" }, { value: "relax", label: "Relax" }]} />}</Field>
          <Field label="Cabin lighting">{() => <Segmented label="Cabin lighting" value={p.lighting} onChange={(lighting) => upd({ lighting })} options={[{ value: "bright", label: "Bright" }, { value: "dim", label: "Dim" }, { value: "dark", label: "Dark" }]} />}</Field>
          <Field label="Seating configuration">{(id) => <Select id={id} value={p.seating} onChange={(e) => upd({ seating: e.target.value as CabinProfile["seating"] })}><option value="any">No preference</option><option value="club">Club (facing)</option><option value="forward">Forward-facing</option><option value="divan">Divan / lie-flat</option></Select>}</Field>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-sm"><span>Stand-up cabin preferred</span><Toggle label="Stand-up cabin" checked={p.standUp} onChange={(standUp) => upd({ standUp })} /></div>
          <Field label="Wi-Fi and connectivity">{() => <Segmented label="Connectivity" value={p.wifi} onChange={(wifi) => upd({ wifi })} options={[{ value: "none", label: "Not needed" }, { value: "nice", label: "Nice to have" }, { value: "required", label: "Required" }]} />}</Field>
          <Field label="Pets or travel considerations">{(id) => <Input id={id} value={p.pets} onChange={(e) => upd({ pets: e.target.value })} placeholder="e.g. 1 small dog in a carrier, wheelchair assistance" />}</Field>
          <Field label="Other service requests">{(id) => <Area id={id} value={p.other} onChange={(other) => upd({ other })} placeholder="Ground transport at arrival, quiet crew, newspapers…" />}</Field>
          <Button variant="primary" onClick={persist} disabled={!dirty}>Save preferences</Button>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <h2 className="display mb-1 text-xl">Cabin service brief</h2>
            <p className="mb-4 text-sm text-steel">A request for an operator to review. It is not an order: no operator is contacted and nothing is prepared.</p>
            {!it ? (
              <EmptyState title="No itinerary selected" action={<Link href="/jetflex/plan"><Button variant="primary">Plan a trip</Button></Link>}>Choose a private charter or empty-leg option in Plan a Trip, then come back to generate a brief.</EmptyState>
            ) : (
              <>
                <Field label="Itinerary">{(id) => <Select id={id} value={it.id} onChange={(e) => setPickId(e.target.value)}>{cands.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}</Field>
                {brief && !brief.applicable ? (
                  <div className="mt-4"><Notice tone="warn"><TriangleAlert size={16} className="mt-0.5 shrink-0" />This itinerary has no private flight, so there is no operator to brief. Pick a charter, an empty leg or a hybrid with a private hop.</Notice></div>
                ) : (
                  <>
                    <div className="mt-4 flex flex-wrap gap-2"><Button variant="primary" onClick={() => { persist(); setMadeFor(it.id); }}>Generate brief</Button>{made && <><Button onClick={copy}>{copied ? <Check size={15} className="text-ok" /> : <Copy size={15} />}{copied ? "Copied" : "Copy"}</Button><Button onClick={download}><Download size={15} />Download .txt</Button></>}</div>
                    {made && brief && (
                      <div className="rise mt-5">
                        {brief.conflicts.length > 0 && <div className="mb-3 space-y-2">{brief.conflicts.map((c, i) => <Notice key={i} tone="warn"><TriangleAlert size={15} className="mt-0.5 shrink-0" />{c.text}</Notice>)}</div>}
                        <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-deep p-4 text-[12.5px] leading-relaxed text-warm" style={{ fontFamily: "var(--font-mono)" }}>{brief.text}</pre>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
