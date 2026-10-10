export function ShareSkeleton() {
  return (
    <main className="flex flex-1 flex-col px-4 pt-[max(env(safe-area-inset-top),12px)]" aria-busy="true" aria-label="Loading">
      <div className="flex h-11 items-center gap-3 pl-1">
        <div className="h-6 w-6 animate-pulse rounded-badge bg-sunk" />
        <div className="h-5 w-44 animate-pulse rounded-badge bg-sunk" />
      </div>
      <div className="mt-5 ml-auto h-48 w-[85%] animate-pulse rounded-[16px] bg-sunk" />
      <div className="mt-6 h-44 animate-pulse rounded-card bg-sunk" />
    </main>
  );
}
