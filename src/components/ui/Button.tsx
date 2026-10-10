import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary: the one main action on a screen. secondary: everything else. */
  variant?: ButtonVariant;
  /** md is 48px tall, sm is 44px. Both meet the 44px tap-target minimum. */
  size?: "md" | "sm";
  /** Stretch to the full width of its container. */
  block?: boolean;
  /** Leading icon. */
  icon?: IconName;
  /** Renders a link that looks like a button. */
  href?: string;
  children?: ReactNode;
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-110",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-sunk",
  ghost: "bg-transparent text-ink hover:bg-sunk",
  danger: "bg-bad-bg text-bad-fg border border-bad/40 hover:brightness-95",
};

const SIZES = {
  md: "min-h-12 px-5 text-base",
  sm: "min-h-11 px-4 text-[15px]",
};

export function buttonClasses({
  variant = "secondary",
  size = "md",
  block = false,
  className,
}: { variant?: ButtonVariant; size?: "md" | "sm"; block?: boolean; className?: string } = {}) {
  return cx(
    "inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold leading-tight",
    "transition-[transform,background-color,filter] duration-100 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-45",
    VARIANTS[variant],
    SIZES[size],
    block && "w-full",
    className,
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  block,
  icon,
  href,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = buttonClasses({ variant, size, block, className });
  const content = (
    <>
      {icon && <Icon name={icon} size={size === "sm" ? 18 : 20} />}
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={classes} aria-label={rest["aria-label"]}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  );
}
