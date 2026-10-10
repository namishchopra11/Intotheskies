import { Suspense } from "react";
import { ReportForm } from "@/components/trip/ReportForm";

export default function NewDisruptionPage() {
  return (
    <main>
      <Suspense fallback={<p role="status" className="py-24 text-center text-ink-3">Loading…</p>}>
        <ReportForm />
      </Suspense>
    </main>
  );
}
