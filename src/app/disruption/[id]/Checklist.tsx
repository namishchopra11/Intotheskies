"use client";

import { useState } from "react";
import { useTripStore } from "@/lib/store";
import type { Contact, Disruption } from "@/lib/types";

function ContactAction({ contact }: { contact: Contact }) {
  const base =
    "mt-1 inline-flex min-h-11 items-center rounded-xl border border-blue-700 px-4 text-sm font-semibold text-blue-800 active:bg-blue-50";
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
  const percent = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    addTask(disruption.id, title);
    setDraft("");
  }

  return (
    <section aria-labelledby="checklist-heading" className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="checklist-heading" className="text-base font-semibold text-neutral-900">
        What to do now
      </h2>

      <div className="mt-3">
        <p className="text-sm text-neutral-700">
          {doneCount} of {tasks.length} done
        </p>
        <div
          role="progressbar"
          aria-label="Checklist progress"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={tasks.length}
          className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-200"
        >
          <div className="h-full rounded-full bg-blue-700 transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <ul className="mt-2 divide-y divide-neutral-100">
        {tasks.map((task) => {
          const contact = task.contactId ? contacts.find((c) => c.id === task.contactId) : undefined;
          return (
            <li key={task.id} className="py-2">
              <div className="flex items-start gap-1">
                <label className="flex min-h-11 flex-1 cursor-pointer items-start gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(disruption.id, task.id)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-blue-700"
                  />
                  <span className={task.done ? "text-neutral-400" : "text-neutral-900"}>
                    <span className={`block text-base font-medium ${task.done ? "line-through" : ""}`}>
                      {task.title}
                    </span>
                    {task.detail && (
                      <span className={`mt-0.5 block text-sm ${task.done ? "line-through" : "text-neutral-600"}`}>
                        {task.detail}
                      </span>
                    )}
                  </span>
                </label>
                {task.source === "custom" && (
                  <button
                    type="button"
                    aria-label="Remove task"
                    onClick={() => removeTask(disruption.id, task.id)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl text-neutral-500 active:bg-neutral-100"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
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

      <form onSubmit={submit} className="mt-3 flex gap-2 border-t border-neutral-100 pt-4">
        <label htmlFor="new-task" className="sr-only">
          Add your own task
        </label>
        <input
          id="new-task"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add your own task"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-3 text-base text-neutral-900 placeholder:text-neutral-400"
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-xl bg-neutral-900 px-5 text-base font-semibold text-white active:bg-neutral-700"
        >
          Add
        </button>
      </form>
    </section>
  );
}
