import { create } from "zustand";
import { accountKey } from "./store";
import type { Profile } from "./types";

const completionKey = (key: string) => `layover:tour:v1:${key}`;

export const useTour = create<{
  active: boolean;
  step: number;
  account: string | null;
  start: (profile: Profile, replay?: boolean) => void;
  go: (step: number) => void;
  finish: () => void;
}>((set, get) => ({
  active: false,
  step: 0,
  account: null,
  start: (profile, replay = false) => {
    const key = accountKey(profile);
    if (!key && !replay) return;
    try {
      if (key && !replay && localStorage.getItem(completionKey(key))) return;
    } catch { /* The tour also works when browser storage is unavailable. */ }
    set({ active: true, step: 0, account: key });
  },
  go: (step) => set({ step }),
  finish: () => {
    const key = get().account;
    try { if (key) localStorage.setItem(completionKey(key), "done"); } catch { /* Keep going without persistence. */ }
    set({ active: false, step: 0 });
  },
}));
