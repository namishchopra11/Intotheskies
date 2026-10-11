import type { ReactNode } from "react";
import { HomeLogo } from "./HomeLogo";

type PageHeaderProps = {
  title: string;
  /** Small line above the title, e.g. "Alex Morgan · San Francisco → Rome · Sat 17 Oct". */
  eyebrow?: string;
  /** Something on the right of the title row, e.g. a ThemeToggle or small Button. */
  action?: ReactNode;
  /**
   * "bar" (default): a compact row (back arrow and an 18px title) for a step inside a flow, like Share.
   * "title": a large headline that says what happened, with an optional eyebrow and body.
   */
  variant?: "title" | "bar";
  /** One or two sentences under the title. */
  children?: ReactNode;
};

const TOP = "pt-[max(env(safe-area-inset-top),12px)]";

/**
 * The top of every screen, so they all start the same way: the Layover logo top left (it
 * always goes home, so it doubles as the way back), then the screen's title.
 */
export function PageHeader({ title, eyebrow, action, variant = "bar", children }: PageHeaderProps) {
  const logoRow = (
    <div className={`flex min-h-[68px] items-center justify-between pr-3 pb-1 pl-5 ${TOP}`}>
      <HomeLogo />
      {variant === "bar" && action && <div className="shrink-0">{action}</div>}
    </div>
  );

  if (variant === "bar") {
    return (
      <header>
        {logoRow}
        <h1 className="truncate px-5 pb-3 text-[22px] leading-tight font-semibold tracking-[-0.01em]">{title}</h1>
      </header>
    );
  }

  return (
    <header className="pb-4">
      {logoRow}
      <div className="flex items-start gap-3 px-5">
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="mb-2 text-[14px] text-ink-2">{eyebrow}</p>}
          <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.01em] text-balance">
            {title}
          </h1>
        </div>
        {action && <div className="shrink-0 pt-0.5">{action}</div>}
      </div>
      {children && <div className="mt-2 px-5 text-ink-2">{children}</div>}
    </header>
  );
}
