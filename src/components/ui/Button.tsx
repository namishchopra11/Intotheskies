import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * primary: the one main action on a screen (a dark key; yellow in dark mode).
   * secondary: an outlined key. success: a secondary key that just worked ("Copied").
   */
  variant?: ButtonVariant;
  /** lg is 60px (the main action), md is 52px, sm is 44px. All meet the 44px tap target. */
  size?: "lg" | "md" | "sm";
  /** Stretch to the full width of its container. */
  block?: boolean;
  /** Leading icon, next to the label. */
  icon?: IconName;
  /**
   * Trailing icon in a square chip at the right edge; the label moves to the left.
   * "Share the new plan  [→]". Use on full-width keys.
   */
  chip?: IconName;
  /** Draw the leading icon's stroke in, e.g. a check after copying. */
  drawIcon?: boolean;
  /** Renders a link that looks like a button. */
  href?: string;
  /** With href: the page-transition direction, e.g. ["nav-forward"] (see PageTransition). */
  transitionTypes?: string[];
  children?: ReactNode;
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "ck-key ck-key-primary bg-accent text-on-accent",
  secondary: "ck-key ck-key-secondary border-2 border-ink bg-surface text-ink",
  success: "ck-key ck-key-success border-2 border-ok-fg bg-ok-bg text-ok-fg",
  ghost: "bg-transparent text-ink hover:bg-sunk active:bg-sunk",
  danger: "border-2 border-bad-fg bg-bad-bg text-bad-fg active:brightness-95",
};

const SIZES = {
  lg: "min-h-15 text-[17px]",
  md: "min-h-13 text-[15px]",
  sm: "min-h-11 text-[15px]",
};

export function buttonClasses({
  variant = "secondary",
  size = "md",
  block = false,
  chip = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: "lg" | "md" | "sm";
  block?: boolean;
  chip?: boolean;
  className?: string;
} = {}) {
  return cx(
    "inline-flex cursor-pointer select-none items-center gap-2 rounded-control font-semibold leading-tight",
    "disabled:pointer-events-none disabled:opacity-45",
    chip ? "justify-between py-1.5 pr-2 pl-5" : "justify-center px-5",
    VARIANTS[variant],
    SIZES[size],
    block && "w-full",
    className,
  );
}

function Chip({ name, variant, size }: { name: IconName; variant: ButtonVariant; size: "lg" | "md" | "sm" }) {
  const big = size === "lg";
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-[6px]",
        big ? "h-11 w-11" : "h-9 w-9",
        variant === "primary" ? "bg-chip text-on-chip" : "bg-sunk text-current",
      )}
    >
      <Icon name={name} size={big ? 20 : 18} strokeWidth={2.5} />
    </span>
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  block,
  icon,
  chip,
  drawIcon,
  href,
  transitionTypes,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = buttonClasses({ variant, size, block, chip: Boolean(chip), className });
  const content = (
    <>
      {chip ? (
        <span className="inline-flex items-center gap-2">
          {icon && <Icon name={icon} size={18} className={drawIcon ? "ck-draw" : undefined} />}
          {children}
        </span>
      ) : (
        <>
          {icon && (
            <Icon
              name={icon}
              size={size === "sm" ? 18 : 20}
              strokeWidth={drawIcon ? 3 : 2}
              className={drawIcon ? "ck-draw" : undefined}
            />
          )}
          {children}
        </>
      )}
      {chip && <Chip name={chip} variant={variant} size={size} />}
    </>
  );
  if (href) {
    return (
      <Link href={href} transitionTypes={transitionTypes} className={classes} aria-label={rest["aria-label"]}>
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
