"use client";

import { create } from "zustand";

type FeedbackState = {
  undo: { label: string; run: () => boolean } | null;
  offerUndo: (label: string, run: () => boolean) => void;
  clearUndo: () => void;
  dismiss: () => void;
};

// Only feedback lives here; trip data and settings remain in the persisted trip store.
export const useFeedback = create<FeedbackState>((set) => ({
  undo: null,
  offerUndo: (label, run) => set({ undo: { label, run } }),
  clearUndo: () => set({ undo: null }),
  dismiss: () => set({ undo: null }),
}));
