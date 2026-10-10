import type { HTMLAttributes } from "react";
export function Card({ as: Tag = "div", padding = "md", variant = "raised", className = "", ...props }: HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "article" | "li"; padding?: "md" | "none"; variant?: "raised" | "inset" }) {
 return <Tag className={`ck-card ${padding === "none" ? "ck-card-no-padding" : ""} ${variant === "inset" ? "ck-card-inset" : ""} ${className}`} {...props} />;
}
