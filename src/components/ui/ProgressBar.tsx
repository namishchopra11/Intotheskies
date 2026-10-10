export function ProgressBar({ value, max = 100, label = "Progress", hideCount = false, className = "" }: { value: number; max?: number; label?: string; hideCount?: boolean; className?: string }) {
 const safeMax = Number.isFinite(max) && max > 0 ? max : 0;
 const clamped = Math.min(safeMax, Math.max(0, Number.isFinite(value) ? value : 0));
 return <div className={className}>{!hideCount && <p className="ck-progress-count"><span>{label}</span><span>{safeMax > 0 && clamped === safeMax ? "All done" : `${clamped} of ${safeMax} done`}</span></p>}<progress className="ck-progress" value={clamped} max={safeMax || 1} aria-label={label} aria-valuetext={`${clamped} of ${safeMax} done`} /></div>;
}
