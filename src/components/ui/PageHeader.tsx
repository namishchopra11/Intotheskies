import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

type PageHeaderProps = {
  title: string;
  /** Small line above the title, e.g. "Alex Morgan · San Francisco → Rome · Sat 17 Oct". */
  eyebrow?: string;
  /** Back link. In the "bar" variant it is an icon-only button and `label` is its accessible name. */
  back?: { href: string; label: string };
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

/** The top of every screen, so they all start the same way. */
export function PageHeader({ title, eyebrow, back, action, variant = "bar", children }: PageHeaderProps) {
  if (variant === "bar") {
    return (
      <header className={`flex items-center gap-1 pr-4 pb-3 pl-2 ${TOP}`}>
        {back && (
          <Link
            href={back.href}
            transitionTypes={["nav-back"]}
            aria-label={back.label}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink hover:bg-sunk"
          >
            <Icon name="chevron-left" size={22} />
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
        {action && <div className="shrink-0">{action}</div>}
      </header>
    );
  }

  return (
    <header className={`px-5 pb-4 ${TOP}`}>
      {back && (
        <Link
          href={back.href}
          transitionTypes={["nav-back"]}
          className="-ml-3 mb-1 inline-flex min-h-11 items-center gap-1 rounded-control pr-3 pl-1 font-medium text-ink-2 hover:text-ink"
        >
          <Icon name="chevron-left" size={22} />
          {back.label}
        </Link>
      )}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="mb-2 text-[14px] text-ink-2">{eyebrow}</p>}
          <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.01em] text-balance">
            {title}
          </h1>
        </div>
        {action && <div className="shrink-0 pt-0.5">{action}</div>}
      </div>
      {children && <div className="mt-2 text-ink-2">{children}</div>}
    </header>
  );
}
