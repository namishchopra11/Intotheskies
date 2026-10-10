"use client";

import { Button, buttonClasses, Card, Icon, ProgressBar } from "@/components/ui";
import { useState } from "react";
import { useTripStore } from "@/lib/store";
import type { Contact, Disruption } from "@/lib/types";

function ContactAction({ contact }: { contact: Contact }) {
  const base =
    buttonClasses({ variant: "secondary", size: "sm", className: "mt-1 max-w-full text-left" });
  if (contact.phone) {
    return (
      <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className={base}>
        Call {contact.name}
      </a>
    );
  }
  if (contact.url) {
    return (
      <a href={contact.url} target="_blank" rel="noopener noreferrer" className={base}>
        Open {contact.name}
      </a>
    );
  }
  return null;
}

export function Checklist({ disruption, contacts }: { disruption: Disruption; contacts: Contact[] }) {
  const toggleTask = useTripStore((s) => s.toggleTask);
  const addTask = useTripStore((s) => s.addTask);
  const removeTask = useTripStore((s) => s.removeTask);
  const [draft, setDraft] = useState("");

  const tasks = disruption.tasks;
  const doneCount = tasks.filter((t) => t.done).length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    addTask(disruption.id, title);
    setDraft("");
  }

  return (
    <Card as="section" aria-labelledby="checklist-heading">
      <h2 id="checklist-heading" className="text-base font-semibold text-ink">
        What to do now
      </h2>

      <div className="mt-3">
        <p className="text-sm text-ink-2">
          {doneCount} of {tasks.length} done
        </p>
        <ProgressBar value={doneCount} max={tasks.length} label="Checklist progress" hideCount className="mt-1" />
      </div>

      <ul className="mt-2 divide-y divide-line">
        {tasks.map((task) => {
          const contact = task.contactId ? contacts.find((c) => c.id === task.contactId) : undefined;
          return (
            <li key={task.id} className="py-2">
              <div className="flex items-start gap-1">
                <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-start gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(disruption.id, task.id)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
                  />
                  <span className={task.done ? "min-w-0 break-words text-ink-3" : "min-w-0 break-words text-ink"}>
                    <span className={`block text-base font-medium ${task.done ? "line-through" : ""}`}>
                      {task.title}
                    </span>
                    {task.detail && (
                      <span className={`mt-0.5 block text-sm ${task.done ? "line-through" : "text-ink-2"}`}>
                        {task.detail}
                      </span>
                    )}
                  </span>
                </label>
                {task.source === "custom" && (
                  <Button
                    variant="ghost"
                    aria-label="Remove task"
                    onClick={() => removeTask(disruption.id, task.id)}
                    className="w-12 shrink-0 px-0 text-ink-3"
                  >
                    <Icon name="x" />
                  </Button>
                )}
              </div>
              {contact && (
                <div className="pl-8">
                  <ContactAction contact={contact} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <form onSubmit={submit} className="mt-3 flex gap-2 border-t border-line pt-4">
        <label htmlFor="new-task" className="sr-only">
          Add your own task
        </label>
        <input
          id="new-task"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add your own task"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-3"
        />
        <Button
          type="submit"
          variant="secondary"
          className="shrink-0"
        >
          Add
        </Button>
      </form>
    </Card>
  );
}
