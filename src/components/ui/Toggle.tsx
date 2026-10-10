"use client";
import { useId } from "react";
export type ToggleProps = { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; id?: string };
export function Toggle({ label, description, checked, onChange, disabled, id }: ToggleProps) {
 const generatedId = useId(); const toggleId = id ?? generatedId;
 return <div className="ck-toggle-row"><div className="ck-toggle-copy"><label htmlFor={toggleId} className="ck-label">{label}</label>{description && <p id={`${toggleId}-description`} className="ck-hint">{description}</p>}</div><button id={toggleId} type="button" role="switch" aria-checked={checked} aria-describedby={description ? `${toggleId}-description` : undefined} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className="ck-toggle"><span className="ck-toggle-track"><span className="ck-toggle-thumb" /></span></button></div>;
}
