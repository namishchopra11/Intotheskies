"use client";

import { create } from "zustand";

type FeedbackState = {
  saved: { id: number; durable: boolean } | null;
  undo: { label: string; run: () => boolean } | null;
  savedResult: (durable: boolean) => void;
  offerUndo: (label: string, run: () => boolean) => void;
  clearUndo: () => void;
  dismiss: () => void;
};

// Only feedback lives here; trip data and settings remain in the persisted trip store.
export const useFeedback = create<FeedbackState>((set) => ({
  saved: null,
  undo: null,
  savedResult: (durable) => set((s) => ({ saved: { id: (s.saved?.id ?? 0) + 1, durable } })),
  offerUndo: (label, run) => set({ undo: { label, run } }),
  clearUndo: () => set({ undo: null }),
  dismiss: () => set({ undo: null, saved: null }),
}));
