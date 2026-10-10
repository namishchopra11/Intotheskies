import type { ButtonHTMLAttributes } from "react";
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; fullWidth?: boolean };
export function Button({ variant = "primary", fullWidth = false, className = "", type = "button", ...props }: ButtonProps) {
 return <button type={type} className={`ck-button ck-button-${variant} ${fullWidth ? "ck-button-wide" : ""} ${className}`} {...props} />;
}
