import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; fullWidth?: boolean; block?: boolean; size?: "md" | "sm"; icon?: IconName; href?: string };
export function buttonClasses({ variant = "secondary", size = "md", block = false, className = "" }: { variant?: ButtonVariant; size?: "md" | "sm"; block?: boolean; className?: string } = {}) {
 return `ck-button ck-button-${variant} ${block ? "ck-button-wide" : ""} ${size === "sm" ? "ck-button-sm" : ""} ${className}`;
}
export function Button({ variant = "secondary", fullWidth = false, block = false, size = "md", icon, href, children, className = "", type = "button", ...props }: ButtonProps) {
 const classes = buttonClasses({ variant, size, block: fullWidth || block, className });
 const content = <>{icon && <Icon name={icon} size={size === "sm" ? 18 : 20} />}{children}</>;
 if (href && !props.disabled) return <Link href={href} className={classes} aria-label={props["aria-label"]}>{content}</Link>;
 return <button type={type} className={classes} {...props}>{content}</button>;
}
