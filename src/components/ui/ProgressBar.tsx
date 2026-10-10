export function ProgressBar({ value, max = 100, label = "Progress" }: { value: number; max?: number; label?: string }) {
 const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
 return <progress className="ck-progress" value={Math.min(safeMax, Math.max(0, Number.isFinite(value) ? value : 0))} max={safeMax} aria-label={label} />;
}
