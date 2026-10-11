import type { StateStorage } from "zustand/middleware";

type RawStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Wraps localStorage so a saved entry that is not JSON, or storage the browser blocks,
 * reads as "nothing saved". Without this the store never finishes loading (zustand stops
 * when the read throws) and every screen stays on its loading skeleton.
 */
export function safeStorage(getStorage: () => RawStorage): StateStorage {
  return {
    getItem: (name) => {
      try {
        const raw = getStorage().getItem(name);
        if (raw === null) return null;
        JSON.parse(raw);
        return raw;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        getStorage().setItem(name, value);
      } catch {
        // Blocked or full: the trip stays in memory for this visit.
      }
    },
    removeItem: (name) => {
      try {
        getStorage().removeItem(name);
      } catch {
        // Nothing to remove.
      }
    },
  };
}
