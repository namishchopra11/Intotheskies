import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

type CardProps = HTMLAttributes<HTMLElement> & {
  /** Use "section" or "article" when the card is a meaningful block of the page. */
  as?: "div" | "section" | "article" | "li";
  /** "none" when the card holds full-bleed rows (e.g. a list with dividers). */
  padding?: "md" | "none";
  /** "inset" is a quieter, sunken panel for secondary info. */
  variant?: "raised" | "inset";
  children?: ReactNode;
};

export function Card({
  as: Tag = "div",
  padding = "md",
  variant = "raised",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cx(
        "rounded-card",
        variant === "raised" ? "bg-surface" : "bg-sunk",
        padding === "md" && "p-4",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
