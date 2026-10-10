import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

type PageHeaderProps = {
  title: string;
  /** Back link, shown as an icon-only button; `label` is its accessible name. */
  back?: { href: string; label: string };
  /** Something on the right of the title row, e.g. a small Button. */
  action?: ReactNode;
};

const TOP = "pt-[max(env(safe-area-inset-top),12px)]";

/** The top of a step inside a flow, like Share: a back arrow and an 18px title. */
export function PageHeader({ title, back, action }: PageHeaderProps) {
  return (
    <header className={`flex items-center gap-1 pr-4 pb-3 pl-2 ${TOP}`}>
      {back && (
        <Link
          href={back.href}
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
