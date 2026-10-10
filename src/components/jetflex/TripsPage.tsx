"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Armchair, Bookmark, History, ShieldCheck, Trash2 } from "lucide-react";
import { METROS } from "@/lib/jetflex/data";
import { fmtDate, fmtDur, usd } from "@/lib/jetflex/time";
import { useJet, useWorld } from "@/lib/jetflex/store";
import { riskLabel } from "./Itinerary";
import { parseText } from "./RequestPanel";
import { Badge, Button, Card, cx, EmptyState, LinkButton, PageHeader, Skeleton, stagger } from "./ui";

export function TripsPage() {
  const router = useRouter();
  const { ready, today, request } = useWorld();
  const { saved, unsave, setRequest, setActive, history } = useJet();
  const [pick, setPick] = useState<string[]>([]);
  const cmp = saved.filter((t) => pick.includes(t.id));
  const toggle = (id: string) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p.slice(-1), id]));
  const open = (id: string, to = "/jetflex/plan") => {
    const t = saved.find((x) => x.id === id)!;
    setRequest(t.request);
    setActive(t.itinerary);
    router.push(to);
  };
  const rows: [string, (t: (typeof saved)[number]) => string][] = [
    ["Route", (t) => `${METROS[t.request.from].short} → ${METROS[t.request.to].short}`],
    ["Dates", (t) => `${fmtDate(t.request.departDate)}${t.request.returnDate ? ` – ${fmtDate(t.request.returnDate)}` : ""}`],
    ["Travelers", (t) => String(t.itinerary.pax)],
    ["Total price", (t) => usd(t.itinerary.totalPrice)],
    ["Per person", (t) => usd(t.itinerary.perPerson)],
    ["Door to door", (t) => fmtDur(t.itinerary.door2doorMin)],
    ["Connections", (t) => String(t.itinerary.stops)],
    ["Schedule risk (modeled)", (t) => `${riskLabel(t.itinerary.risk)} · ${Math.round(t.itinerary.risk * 100)}%`],
    ["Est. saving vs charter", (t) => usd(t.savings)],
  ];
  return (
    <>
      <PageHeader eyebrow="My trips" title="Saved itineraries and request history">Saved trips keep the full itinerary as it was priced, so you can reopen it, compare two side by side or protect it with JetShield. Stored only in this browser.</PageHeader>
      {!ready ? <Skeleton className="h-48" /> : !saved.length ? (
        <EmptyState icon={<Bookmark size={28} />} title="No saved trips yet" action={<><LinkButton href="/jetflex/plan" variant="primary">Plan a trip</LinkButton><LinkButton href="/jetflex#opp">Browse empty legs</LinkButton></>}>Save an itinerary from Plan a Trip and it will appear here, ready to reopen, compare with another, or protect with JetShield.</EmptyState>
      ) : (
        <div className="space-y-4">
          {saved.map((t, n) => (
            <Card key={t.id} className={cx("rise p-4 sm:p-5", pick.includes(t.id) && "border-gold")} style={stagger(n)}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap gap-1.5"><Badge tone="gold">{t.itinerary.kind.replace("_", " ")}</Badge>{t.itinerary.recoveredFrom && <Badge tone="ok">Recovered via JetShield</Badge>}<Badge tone="steel">Simulated</Badge></div>
                  <h2 className="display text-xl">{t.itinerary.name}</h2>
                  <p className="num mt-1 text-sm text-steel">{METROS[t.request.from].short} → {METROS[t.request.to].short} · {fmtDate(t.request.departDate)}{t.request.returnDate ? ` – ${fmtDate(t.request.returnDate)}` : " · one way"} · {t.itinerary.pax} travelers</p>
                  <p className="num mt-1 text-sm">{usd(t.itinerary.totalPrice)} <span className="text-steel">· {usd(t.itinerary.perPerson)} pp · {fmtDur(t.itinerary.door2doorMin)} door to door</span></p>
                  <p className="mt-1 text-xs text-steel">Saved {new Date(t.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                  <Button variant="primary" className="order-1 col-span-2 sm:order-2 sm:col-span-1" onClick={() => open(t.id)}>Open</Button>
                  <label className="order-4 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line px-3 py-2 text-sm sm:order-1 sm:min-h-0"><input type="checkbox" checked={pick.includes(t.id)} onChange={() => toggle(t.id)} className="h-4 w-4 accent-[#D5B779]" />Compare</label>
                  <Button className="order-2 sm:order-3" onClick={() => open(t.id, "/jetflex/shield")}><ShieldCheck size={15} />JetShield</Button>
                  <Button className="order-3 sm:order-4" onClick={() => open(t.id, "/jetflex/cabin")}><Armchair size={15} />Brief</Button>
                  <Button variant="danger" className="order-5 sm:order-5" onClick={() => { unsave(t.id); setPick((p) => p.filter((x) => x !== t.id)); }}><Trash2 size={15} />Remove</Button>
                </div>
              </div>
            </Card>
          ))}
          {cmp.length === 2 && (
            <div className="rise overflow-hidden rounded-2xl border border-gold/50">
              <table className="w-full table-fixed text-[13px] sm:text-sm"><caption className="sr-only">Comparison of two saved trips</caption>
                <thead><tr><th className="w-[30%] p-2.5 sm:w-auto sm:p-3" />{cmp.map((t) => <th key={t.id} scope="col" className="break-words border-l border-line p-2.5 text-left align-top text-xs font-medium sm:p-3 sm:text-sm">{t.itinerary.name}</th>)}</tr></thead>
                <tbody>{rows.map(([l, f]) => <tr key={l} className="border-t border-line/70"><th scope="row" className="p-2.5 text-left text-xs font-normal text-steel sm:p-3">{l}</th>{cmp.map((t) => <td key={t.id} className="num break-words border-l border-line/70 p-2.5 sm:p-3">{f(t)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
          {cmp.length === 1 && <p className="text-sm text-steel">Pick one more trip to compare.</p>}
        </div>
      )}
      <section className="mt-12">
        <h2 className="display mb-4 flex items-center gap-2 text-2xl"><History size={20} className="text-steel" />Request history</h2>
        {history.length ? (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {history.map((h) => (
              <li key={h.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="min-w-0 text-sm sm:truncate" title={h.text}>{h.text}</p>
                <Button size="sm" className="shrink-0" onClick={() => { void parseText(h.text, today, request).then((p) => { setRequest(p.request); router.push("/jetflex/plan"); }); }}>Run again</Button>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No requests yet" className="py-8" action={<LinkButton href="/jetflex">Describe a trip</LinkButton>}>Trips you describe in plain language are listed here so you can run them again with fresh dates and inventory.</EmptyState>}
      </section>
    </>
  );
}
