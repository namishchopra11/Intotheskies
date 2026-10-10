"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Armchair, Bookmark, History, ShieldCheck, Trash2 } from "lucide-react";
import { METROS } from "@/lib/jetflex/data";
import { parseRequest } from "@/lib/jetflex/parser";
import { fmtDate, fmtDur, usd } from "@/lib/jetflex/time";
import { useJet, useWorld } from "@/lib/jetflex/store";
import { riskLabel } from "./Itinerary";
import { Badge, Button, Card, cx, EmptyState, PageHeader, Skeleton } from "./ui";

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
        <EmptyState icon={<Bookmark size={28} />} title="No saved trips yet" action={<Link href="/jetflex/plan"><Button variant="primary">Plan a trip</Button></Link>}>Save an itinerary from Plan a Trip and it will appear here.</EmptyState>
      ) : (
        <div className="space-y-4">
          {saved.map((t) => (
            <Card key={t.id} className={cx("p-5", pick.includes(t.id) && "border-gold")}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap gap-1.5"><Badge tone="gold">{t.itinerary.kind.replace("_", " ")}</Badge>{t.itinerary.recoveredFrom && <Badge tone="ok">Recovered via JetShield</Badge>}<Badge tone="steel">Simulated</Badge></div>
                  <h2 className="display text-xl">{t.itinerary.name}</h2>
                  <p className="num mt-1 text-sm text-steel">{METROS[t.request.from].short} → {METROS[t.request.to].short} · {fmtDate(t.request.departDate)}{t.request.returnDate ? ` – ${fmtDate(t.request.returnDate)}` : " · one way"} · {t.itinerary.pax} travelers</p>
                  <p className="num mt-1 text-sm">{usd(t.itinerary.totalPrice)} <span className="text-steel">· {usd(t.itinerary.perPerson)} pp · {fmtDur(t.itinerary.door2doorMin)} door to door</span></p>
                  <p className="mt-1 text-xs text-steel">Saved {new Date(t.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"><input type="checkbox" checked={pick.includes(t.id)} onChange={() => toggle(t.id)} className="accent-[#D5B779]" />Compare</label>
                  <Button variant="primary" onClick={() => open(t.id)}>Open</Button>
                  <Button onClick={() => open(t.id, "/jetflex/shield")}><ShieldCheck size={15} />JetShield</Button>
                  <Button onClick={() => open(t.id, "/jetflex/cabin")}><Armchair size={15} />Brief</Button>
                  <Button variant="danger" onClick={() => { unsave(t.id); setPick((p) => p.filter((x) => x !== t.id)); }}><Trash2 size={15} />Remove</Button>
                </div>
              </div>
            </Card>
          ))}
          {cmp.length === 2 && (
            <div className="overflow-x-auto rounded-2xl border border-gold/50">
              <table className="w-full min-w-[520px] text-sm"><caption className="sr-only">Comparison of two saved trips</caption>
                <thead><tr><th className="p-3" />{cmp.map((t) => <th key={t.id} scope="col" className="border-l border-line p-3 text-left font-medium">{t.itinerary.name}</th>)}</tr></thead>
                <tbody>{rows.map(([l, f]) => <tr key={l} className="border-t border-line/70"><th scope="row" className="p-3 text-left text-xs font-normal text-steel">{l}</th>{cmp.map((t) => <td key={t.id} className="num border-l border-line/70 p-3">{f(t)}</td>)}</tr>)}</tbody>
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
              <li key={h.id} className="flex items-center justify-between gap-4 p-4">
                <p className="min-w-0 truncate text-sm" title={h.text}>{h.text}</p>
                <Button size="sm" onClick={() => { setRequest(parseRequest(h.text, today, request).request); router.push("/jetflex/plan"); }}>Run again</Button>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-steel">Natural-language requests you plan will be listed here.</p>}
      </section>
    </>
  );
}
