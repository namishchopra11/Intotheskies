import type { SVGProps } from "react";

export type ArrowDirection = "right" | "left" | "up" | "down" | "up-right" | "down-right";

const ROTATE: Record<ArrowDirection, number> = {
  right: 0,
  "down-right": 45,
  down: 90,
  left: 180,
  up: 270,
  "up-right": -45,
};

/**
 * The one motif: a filled wayfinding arrow, square-ended shaft and a 45° head, as on airport
 * signs. Used huge and cropped on the status sign, inside primary keys, and as the bullet on
 * what to do next. Decorative unless given a label.
 */
export function SignArrow({
  direction = "right",
  size = 24,
  label,
  className,
  ...rest
}: Omit<SVGProps<SVGSVGElement>, "direction"> & { direction?: ArrowDirection; size?: number | string; label?: string }) {
  const deg = ROTATE[direction];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
      className={`shrink-0 ${className ?? ""}`}
      {...rest}
    >
      <path d={ARROW_PATH} transform={deg ? `rotate(${deg} 12 12)` : undefined} />
    </svg>
  );
}

/** The arrow's outline on a 24 grid, pointing right. */
export const ARROW_PATH = "M2 9.75h11.6L8.4 4.55 11.05 1.9 21.15 12l-10.1 10.1-2.65-2.65 5.2-5.2H2z";
