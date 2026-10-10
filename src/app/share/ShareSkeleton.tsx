export function ShareSkeleton() {
  return (
    <main className="flex flex-1 flex-col px-4 pt-6" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-28 animate-pulse rounded bg-sunk" />
      <div className="mt-3 h-8 w-56 animate-pulse rounded bg-sunk" />
      <div className="mt-6 h-48 animate-pulse rounded-card bg-sunk" />
      <div className="mt-5 h-40 animate-pulse rounded-card bg-sunk" />
    </main>
  );
}
