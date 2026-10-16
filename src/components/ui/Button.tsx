import Link from "next/link";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";
import { SignArrow } from "./SignArrow";

export type ButtonVariant = "primary" | "secondary" | "sunk" | "onPlate" | "tinted" | "ghost" | "danger" | "success" | "plate";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * primary: the one way to go on a screen (sign yellow). plate: a black sign key.
   * secondary: a plate one tone off the ground (sunk: on a surface; onPlate: on a black band). tinted: a pale-yellow key for repeated
   * actions in a list. success: a key that just worked ("Copied").
   */
  variant?: ButtonVariant;
  /** lg is 60px (the main action, condensed label), md is 52px, sm is 44px. */
  size?: "lg" | "md" | "sm";
  /** Stretch to the full width of its container. */
  block?: boolean;
  /** Leading icon, next to the label. */
  icon?: IconName;
  /**
   * Trailing cell at the right edge; the label moves to the left. "arrow-right" draws the
   * wayfinding arrow. Use on full-width keys.
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
  primary: "ck-key ck-key-primary bg-sign text-on-sign",
  plate: "ck-key bg-key text-on-key",
  secondary: "ck-key ck-key-secondary bg-surface text-ink",
  sunk: "ck-key bg-sunk text-ink",
  onPlate: "ck-key bg-white/12 text-on-plate",
  tinted: "ck-key bg-accent-soft text-ink",
  success: "ck-key bg-ok-bg text-ok-fg",
  ghost: "ck-key bg-transparent text-ink [@media(hover:hover)]:hover:bg-sunk active:bg-sunk",
  danger: "ck-key bg-bad-bg text-bad-fg",
};

const SIZES = {
  lg: "min-h-[60px] font-display text-[23px] font-bold tracking-[0.005em]",
  md: "min-h-13 text-[16px] font-semibold",
  sm: "min-h-11 text-[15px] font-semibold",
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
    "inline-flex cursor-pointer select-none items-center gap-2 rounded-control leading-tight",
    "disabled:pointer-events-none disabled:opacity-40",
    chip ? "justify-between py-1.5 pr-1.5 pl-5" : "justify-center px-5",
    VARIANTS[variant],
    SIZES[size],
    block && "w-full",
    className,
  );
}

/** The trailing cell: an ink square on yellow (or a quiet one elsewhere) holding the arrow. */
function Chip({ name, variant, size }: { name: IconName; variant: ButtonVariant; size: "lg" | "md" | "sm" }) {
  const big = size === "lg";
  const loud = variant === "primary";
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-[3px]",
        big ? "h-12 w-12" : "h-10 w-10",
        loud ? "bg-on-sign text-sign" : variant === "plate" ? "bg-sign text-on-sign" : "bg-sunk text-current",
      )}
    >
      {name === "arrow-right" ? (
        <SignArrow size={big ? 24 : 20} className="ck-key-arrow" />
      ) : (
        <Icon name={name} size={big ? 22 : 18} strokeWidth={2.5} />
      )}
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
  const iconSize = size === "lg" ? 22 : size === "sm" ? 18 : 20;
  const content = (
    <>
      {chip ? (
        <span className="inline-flex items-center gap-2">
          {icon && <Icon name={icon} size={iconSize} className={drawIcon ? "ck-draw" : undefined} />}
          {children}
        </span>
      ) : (
        <>
          {icon && (
            <Icon name={icon} size={iconSize} strokeWidth={drawIcon ? 3 : 2.25} className={drawIcon ? "ck-draw" : undefined} />
          )}
          {children}
        </>
      )}
      {chip && <Chip name={chip} variant={variant} size={size} />}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        transitionTypes={transitionTypes}
        className={classes}
        aria-label={rest["aria-label"]}
        onClick={rest.onClick as MouseEventHandler<HTMLAnchorElement> | undefined}
      >
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
