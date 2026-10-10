"use client";
import { useId } from "react";
export type ToggleProps = { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; id?: string; className?: string };
export function Toggle({ label, description, checked, onChange, disabled, id, className = "" }: ToggleProps) {
 const generatedId = useId(); const toggleId = id ?? generatedId;
 return <button id={toggleId} type="button" role="switch" aria-checked={checked} aria-labelledby={`${toggleId}-label`} aria-describedby={description ? `${toggleId}-description` : undefined} disabled={disabled} onClick={() => onChange(!checked)} className={`ck-toggle-row ck-toggle-full ${className}`}><span className="ck-toggle-copy"><span id={`${toggleId}-label`} className="ck-label">{label}</span>{description && <span id={`${toggleId}-description`} className="ck-hint" style={{ display: "block" }}>{description}</span>}</span><span className="ck-toggle-track" aria-hidden="true"><span className="ck-toggle-thumb" /></span></button>;
}
