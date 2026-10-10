"use client";
import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { decodeShare, type ShareSnapshot } from "@/lib/domain/shareLink";
import { cityName } from "@/lib/domain/airports";
import { formatDate, formatDateTime, timePart } from "@/lib/domain/time";
import { Badge, Card, type BadgeStatus } from "@/components/ui";
import { Brand, Icon } from "@/components/ui/Icon";

function subscribe(callback: () => void) { window.addEventListener("hashchange", callback); return () => window.removeEventListener("hashchange", callback); }
const getHash = () => window.location.hash;
const serverHash = () => null;
function FlightCard({ flight, snapshot }: { flight: ShareSnapshot["flights"][number]; snapshot: ShareSnapshot }) {
 const connection = snapshot.impact.connection?.flightId === flight.id ? snapshot.impact.connection : null;
 const unknown = flight.status === "cancelled" && (!flight.original || flight.original.arriveAt === flight.arriveAt);
 const status: BadgeStatus = unknown ? "danger" : connection?.status === "missed" ? "danger" : connection?.status === "tight" || connection?.minutesAfter === null ? "warning" : flight.status === "delayed" ? "warning" : flight.status === "rebooked" ? "resolved" : "on-time";
 const label = unknown ? "Cancelled" : connection?.minutesAfter === null ? "Connection at risk" : connection?.status === "missed" ? "Expected missed connection" : connection?.status === "tight" ? "Tight connection" : flight.status === "delayed" ? "Delayed" : flight.status === "rebooked" ? "Rebooked" : "On time";
 return <Card><div className="ck-flight-top"><span className="ck-flight-name">{flight.airline} · {flight.flightNumber}</span><Badge status={status}>{label}</Badge></div>
  <div className="ck-route"><div><p className="ck-airport">{flight.from}</p><p className="ck-hint">{cityName(flight.from)}</p>{!unknown && <><p className="ck-time">{timePart(flight.departAt)}</p><p className="ck-hint">{formatDate(flight.departAt)}</p></>}</div><Icon name="arrow" style={{ marginTop: 9 }} /><div><p className="ck-airport">{flight.to}</p><p className="ck-hint">{cityName(flight.to)}</p>{!unknown && <><p className="ck-time">{timePart(flight.arriveAt)}</p><p className="ck-hint">{formatDate(flight.arriveAt)}</p></>}</div></div>
  {unknown ? <p className="ck-hint" style={{ marginTop: 16 }}>No replacement flight confirmed yet.</p> : flight.original && (flight.original.departAt !== flight.departAt || flight.original.arriveAt !== flight.arriveAt || flight.original.flightNumber !== flight.flightNumber) && <><hr className="ck-rule" /><p className="ck-hint">Previously {flight.original.flightNumber}: departure {formatDateTime(flight.original.departAt)}; arrival {formatDateTime(flight.original.arriveAt)}.</p></>}
  {flight.bookingRef && <p className="ck-hint" style={{ marginTop: 14 }}>Booking reference: <strong>{flight.bookingRef}</strong></p>}
 </Card>;
}
export default function SharedUpdatePage() {
 const fragment = useSyncExternalStore(subscribe, getHash, serverHash);
 const snapshot = useMemo(() => fragment === null ? null : decodeShare(fragment), [fragment]);
 if (fragment === null) return <main className="ck-shell"><Brand /><p role="status" className="ck-empty">Opening your travel update…</p></main>;
 if (!snapshot) return <main className="ck-shell"><Brand /><Card className="ck-empty"><Badge>Travel update</Badge><h1>{fragment ? "This link didn’t come through." : "Your update is missing."}</h1><p>{fragment ? "It may have been cut short when it was copied. Ask the traveller to send a fresh link using Copy link." : "Ask the traveller to send their full ConnectionKeeper link. It will include the travel update."}</p><Link href="/" className="ck-button ck-button-secondary ck-button-wide">Open ConnectionKeeper</Link></Card><p className="ck-hint">You don’t need an account to read a shared update.</p></main>;
 const changedText = snapshot.summary.split("What changed:\n")[1]?.split("\n\nRevised itinerary:")[0] ?? snapshot.summary;
 const unresolved = snapshot.openTasks.length > 0;
 const allDone = !unresolved && snapshot.summary.includes("Still to sort out:\nNothing. Everything on my list is done.");
 return <main className="ck-shell"><Brand />
  <div className="ck-heading" style={{ marginTop: 28 }}><p className="ck-eyebrow">A travel update for you</p><h1>{snapshot.travelerName || "Your traveller"}’s<br />trip has changed.</h1><p>{snapshot.tripName}</p></div>
  <div className="ck-stack">
   <Card><Badge status={snapshot.impact.delayMinutes === null ? "danger" : snapshot.disruption.type === "rebooked" ? "resolved" : "warning"}>{snapshot.disruption.type === "delay" ? "Flight delayed" : snapshot.disruption.type === "cancellation" ? "Flight cancelled" : snapshot.disruption.type === "missed_connection" ? "Connection missed" : "Flight rebooked"}</Badge><h2 className="ck-section-title" style={{ marginTop: 16 }}>What changed</h2><p style={{ fontSize: 15, margin: "10px 0 0", whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{changedText}</p></Card>
   <section aria-labelledby="itinerary-title"><h2 id="itinerary-title" className="ck-section-title" style={{ margin: "12px 0" }}>The revised itinerary</h2><p className="ck-hint" style={{ marginBottom: 14 }}>All times are local to each airport.</p><div className="ck-stack">{snapshot.flights.map((flight) => <FlightCard key={flight.id} flight={flight} snapshot={snapshot} />)}</div></section>
   {snapshot.stays.length > 0 && <section aria-labelledby="stay-title"><h2 id="stay-title" className="ck-section-title" style={{ margin: "12px 0" }}>Where they’re staying</h2><div className="ck-stack">{snapshot.stays.map((stay) => <Card key={stay.id}><h3 className="ck-section-title">{stay.name}</h3><p className="ck-hint">{stay.address}</p><hr className="ck-rule" /><p className="ck-hint">Check-in <strong>{formatDateTime(stay.checkIn)}</strong><br />Check-out <strong>{formatDateTime(stay.checkOut)}</strong></p>{snapshot.impact.affectedStays.some((item) => item.stayId === stay.id) && <p style={{ marginBottom: 0 }}><Badge status="warning">Check-in may be affected</Badge></p>}{stay.confirmation && <p className="ck-hint" style={{ marginTop: 12 }}>Confirmation: <strong>{stay.confirmation}</strong></p>}</Card>)}</div></section>}
   {unresolved && <Card><h2 className="ck-section-title">Still being sorted out</h2><p className="ck-hint">These next steps were unfinished when this link was shared.</p><ul className="ck-open-tasks">{snapshot.openTasks.map((task, index) => <li key={`${index}-${task}`}>{task}</li>)}</ul></Card>}
   {allDone && <Card><Badge status="resolved">Next steps complete</Badge><p className="ck-hint" style={{ marginTop: 12 }}>Everything on their list was done when this update was shared.</p></Card>}
   <p className="ck-notice"><Icon name="clock" width="16" height="16" /><span>This is a snapshot shared by {snapshot.travelerName || "the traveller"}. It won’t update on its own. Ask them for the latest if plans change again.</span></p>
  </div>
  <footer className="ck-footer">Shared with ConnectionKeeper.<br />A little clarity when travel changes.</footer>
 </main>;
}
