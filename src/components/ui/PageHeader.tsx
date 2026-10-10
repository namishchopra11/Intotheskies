import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

type PageHeaderProps = {
  title: string;
  /** Small line above the title, e.g. the trip name "Lisbon to Tokyo". */
  eyebrow?: string;
  /** Back link shown above everything. */
  back?: { href: string; label: string };
  /** Something on the right of the title row, e.g. a ThemeToggle or small Button. */
  action?: ReactNode;
  /** One or two sentences under the title. */
  children?: ReactNode;
};

/** The top of every screen, so they all start the same way. */
export function PageHeader({ title, eyebrow, back, action, children }: PageHeaderProps) {
  return (
    <header className="px-4 pt-[max(env(safe-area-inset-top),12px)] pb-4">
      {back && (
        <Link
          href={back.href}
          className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 rounded-control pr-3 pl-1 font-medium text-ink-2 hover:text-ink"
        >
          <Icon name="chevron-left" size={22} />
          {back.label}
        </Link>
      )}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="mb-1 flex items-center gap-2 text-[13px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
              <span aria-hidden="true" className="inline-block h-3 w-1 rounded-full bg-signal" />
              {eyebrow}
            </p>
          )}
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
