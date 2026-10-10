import type { SVGProps } from "react";
export type IconName = "route" | "back" | "arrow" | "share" | "copy" | "link" | "clock" | "check";
const paths: Record<IconName, React.ReactNode> = {
 route: <><path d="M5 17V8a4 4 0 0 1 8 0v8a3 3 0 0 0 6 0V5" /><path d="m16 8 3-3 3 3" /><circle cx="5" cy="18" r="1" /></>,
 back: <><path d="m10 5-7 7 7 7M3 12h18" /></>,
 arrow: <><path d="m14 5 7 7-7 7M3 12h18" /></>,
 share: <><path d="M12 16V3m-4 4 4-4 4 4M5 12v8h14v-8" /></>,
 copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 8V3H3v12h5" /></>,
 link: <><path d="m10 14 4-4m-6 5-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m2 2 1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0" /></>,
 clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
 check: <><path d="m5 12 4 4L19 6" /></>,
};
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
export function Brand() { return <header className="ck-brand"><span className="ck-mark"><Icon name="route" width="21" height="21" /></span><span>ConnectionKeeper</span></header>; }
