"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStoreReady, useTripStore } from "@/lib/store";
import { buildSummary, DEFAULT_SUMMARY_OPTIONS, type SummaryOptions } from "@/lib/domain/summary";
import { encodeShare } from "@/lib/domain/shareLink";
import { Button, Card, Sheet, Toggle } from "@/components/ui";
import { Brand, Icon } from "@/components/ui/Icon";

function Shell({ children }: { children: React.ReactNode }) { return <main className="ck-shell"><Brand />{children}</main>; }
function ShareView() {
 const { id } = useParams<{ id: string }>();
 const ready = useStoreReady();
 const trip = useTripStore((state) => state.trip);
 const [options, setOptions] = useState<SummaryOptions>({ ...DEFAULT_SUMMARY_OPTIONS });
 const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
 const [busy, setBusy] = useState(false);
 const [manual, setManual] = useState<{ title: string; text: string } | null>(null);
 const [completed, setCompleted] = useState<string | null>(null);
 const disruption = trip?.disruptions.find((item) => item.id === id);
 function option(key: keyof SummaryOptions, value: boolean) {
  setOptions((previous) => ({ ...previous, [key]: value })); setFeedback(null); setCompleted(null);
 }
 if (!ready) return <Shell><p role="status" className="ck-empty">Loading your update…</p></Shell>;
 if (!trip || !disruption) return <Shell><Card className="ck-empty"><h1>Let’s find your trip</h1><p>This update isn’t saved on this device. Open your trip to choose the change you want to share.</p><Link href="/" className="ck-button ck-button-primary ck-button-wide">Back to your trip</Link></Card></Shell>;
 const summary = buildSummary(trip, id, options);
 const fragment = encodeShare(trip, id, options);
 function snapshotLink() { return `${window.location.origin}/s#${fragment}`; }
 async function copy(text: string, kind: "text" | "link") {
  setFeedback(null); setCompleted(null); setBusy(true);
  try {
   if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
   await navigator.clipboard.writeText(text);
   setCompleted(kind); setFeedback({ text: kind === "link" ? "Link copied. It’s ready to paste." : "Update copied. It’s ready to paste." });
  } catch {
   setManual({ title: kind === "link" ? "Copy your link" : "Copy your update", text });
   setFeedback({ text: "Automatic copying isn’t available here. Select and copy below.", error: true });
  } finally { setBusy(false); }
 }
 async function share() {
  setFeedback(null); setCompleted(null);
  if (!navigator.share) { setFeedback({ text: "Sharing isn’t available in this browser. Use Copy text or Copy link below." }); return; }
  setBusy(true);
  try { await navigator.share({ title: `Travel update from ${trip!.travelerName}`, text: summary }); setCompleted("share"); setFeedback({ text: "Update shared." }); }
  catch (error) { setFeedback({ text: error instanceof Error && error.name === "AbortError" ? "Sharing cancelled. Your update is still here." : "That didn’t share. Try again, or copy the update below.", error: !(error instanceof Error && error.name === "AbortError") }); }
  finally { setBusy(false); }
 }
 return <Shell>
  <Link href={`/disruption/${id}`} className="ck-back"><Icon name="back" width="16" height="16" />Back to your next steps</Link>
  <div className="ck-heading"><p className="ck-eyebrow">Keep your people in the loop</p><h1>Send a calm update.</h1><p>Choose what to include. We’ll take care of the wording.</p></div>
  <div className="ck-stack">
   <Card className="ck-options"><h2 className="ck-section-title">What would you like to share?</h2>
    <Toggle label="Booking references" description="Hidden by default. These codes can be used to change a booking." checked={options.includeBookingRefs} onChange={(checked) => option("includeBookingRefs", checked)} />
    <Toggle label="Hotel details" description="Where you’re staying and check-in dates." checked={options.includeStays} onChange={(checked) => option("includeStays", checked)} />
    <Toggle label="What’s still unresolved" description="The things you’re still sorting out." checked={options.includeOpenTasks} onChange={(checked) => option("includeOpenTasks", checked)} />
   </Card>
   <div className="ck-actions">
    <Button variant="primary" fullWidth onClick={share} disabled={busy || !summary}><Icon name={completed === "share" ? "check" : "share"} />{completed === "share" ? "Shared" : "Share update"}</Button>
    <div className="ck-actions-pair"><Button variant="secondary" onClick={() => copy(summary, "text")} disabled={busy || !summary}><Icon name={completed === "text" ? "check" : "copy"} />{completed === "text" ? "Text copied" : "Copy text"}</Button><Button variant="secondary" onClick={() => copy(snapshotLink(), "link")} disabled={busy || !fragment}><Icon name={completed === "link" ? "check" : "link"} />{completed === "link" ? "Link copied" : "Copy link"}</Button></div>
    <div aria-live="polite" aria-atomic="true">{feedback && <p className={`ck-feedback ${feedback.error ? "ck-feedback-error" : ""}`}>{feedback.text}</p>}</div>
   </div>
   <p className="ck-notice"><Icon name="clock" width="16" height="16" /><span>A shared link is a snapshot from now. It won’t update on its own.</span></p>
   <section aria-labelledby="preview-title"><h2 id="preview-title" className="ck-section-title" style={{ marginBottom: 12 }}>Your message</h2><div className="ck-preview"><div className="ck-preview-meta"><Icon name="check" width="16" height="16" />Ready to send · from {trip.travelerName}</div><pre>{summary || "Your update is being prepared."}</pre></div></section>
  </div>
  <footer className="ck-footer">Only the details you choose go into your update.</footer>
  <Sheet open={manual !== null} title={manual?.title ?? "Copy update"} onClose={() => setManual(null)}><p className="ck-hint" style={{ marginBottom: 12 }}>Press and hold to copy, or use your keyboard’s copy shortcut.</p><textarea className="ck-input" rows={8} readOnly value={manual?.text ?? ""} aria-label={manual?.title ?? "Update to copy"} onFocus={(event) => event.currentTarget.select()} /><Button fullWidth variant="secondary" style={{ marginTop: 12 }} onClick={() => { const input = document.querySelector<HTMLTextAreaElement>(".ck-sheet textarea"); input?.focus(); input?.select(); }}>Select all</Button></Sheet>
 </Shell>;
}
export default function SharePage() { return <Suspense fallback={<Shell><p role="status" className="ck-empty">Loading your update…</p></Shell>}><ShareView /></Suspense>; }
