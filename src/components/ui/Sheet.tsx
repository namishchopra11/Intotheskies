"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./Button";
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
 const dialog = useRef<HTMLDialogElement>(null); const titleId = useId();
 useEffect(() => {
  const element = dialog.current; if (!element) return;
  if (open && !element.open) element.showModal();
  if (!open && element.open) element.close();
  if (!open) return;
  const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
  return () => { document.body.style.overflow = previous; if (element.open) element.close(); };
 }, [open]);
 return <dialog ref={dialog} className="ck-sheet" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target !== event.currentTarget) return; const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); }}><div className="ck-sheet-heading"><h2 id={titleId}>{title}</h2><Button variant="ghost" onClick={onClose} aria-label="Close sheet">Close</Button></div>{children}{footer && <div className="ck-sheet-footer">{footer}</div>}</dialog>;
}
