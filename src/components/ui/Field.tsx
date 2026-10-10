"use client";
import { useId, type InputHTMLAttributes } from "react";
export type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };
export function Field({ label, error, hint, id, className = "", "aria-describedby": describedBy, ...props }: FieldProps) {
 const generatedId = useId(); const inputId = id ?? generatedId;
 return <div className="ck-field"><label className="ck-label" htmlFor={inputId}>{label}</label>
 <input {...props} id={inputId} className={`ck-input ${className}`} aria-invalid={error ? true : props["aria-invalid"]} aria-describedby={[describedBy, hint ? `${inputId}-hint` : "", error ? `${inputId}-error` : ""].filter(Boolean).join(" ") || undefined} />
 {hint && <p id={`${inputId}-hint`} className="ck-hint">{hint}</p>}{error && <p id={`${inputId}-error`} className="ck-error" role="alert">{error}</p>}</div>;
}
