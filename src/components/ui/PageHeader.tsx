import type { ReactNode } from "react";
import { BackButton } from "./BackButton";
import { HomeLogo } from "./HomeLogo";

type PageHeaderProps = {
  title: string;
  /** Small line above the title, e.g. "Alex Morgan · San Francisco – Rome · Sat 17 Oct". */
  eyebrow?: string;
  /** Something on the right of the top bar, e.g. a small Button. */
  action?: ReactNode;
  /**
   * "bar" (default): the screen's name set like a sign, under the top bar.
   * "title": a longer headline that says what happened, with optional lines under it.
   */
  variant?: "title" | "bar";
  /** One or two sentences under the title. */
  children?: ReactNode;
};

/**
 * The top of every inner screen, so they all start the same way: a solid bar with Back and
 * the Layover logo (the logo always goes home), then the screen's name in big condensed type.
 */
export function PageHeader({ title, eyebrow, action, variant = "bar", children }: PageHeaderProps) {
  return (
    <>
      <div className="sticky top-0 z-30 flex min-h-[60px] items-center justify-between bg-bg pt-[env(safe-area-inset-top)] pr-2 pl-4">
        <div className="flex items-center gap-1">
          <BackButton />
          <HomeLogo compact />
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <header className="ck-rise px-5 pt-3 pb-6">
        {eyebrow && <p className="mb-2 text-[15px] font-medium text-ink-2">{eyebrow}</p>}
        <h1
          className={
            variant === "title"
              ? "font-display text-[40px] leading-[0.98] font-bold text-balance"
              : "font-display text-[52px] leading-[0.9] font-bold"
          }
        >
          {title}
        </h1>
        {children && <div className="mt-3 text-[16px] text-ink-2">{children}</div>}
      </header>
    </>
  );
}
