import { describe, expect, it } from "vitest";
import { createJSONStorage } from "zustand/middleware";
import { safeStorage } from "@/lib/safeStorage";

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const blocked = () => {
  throw new Error("The operation is insecure.");
};

describe("safeStorage", () => {
  it("passes valid JSON through and writes normally", () => {
    const raw = memory({ trip: '{"state":{"trip":null},"version":2}' });
    const storage = safeStorage(() => raw);
    expect(storage.getItem("trip")).toBe('{"state":{"trip":null},"version":2}');
    storage.setItem("trip", "{}");
    expect(raw.data.get("trip")).toBe("{}");
    storage.removeItem("trip");
    expect(storage.getItem("trip")).toBeNull();
  });

  it("reads an entry that is not JSON as nothing saved", () => {
    const storage = safeStorage(() => memory({ trip: "{not json!!" }));
    expect(storage.getItem("trip")).toBeNull();
    // This is the read zustand does while loading; it must not throw.
    expect(createJSONStorage(() => storage)!.getItem("trip")).toBeNull();
  });

  it("never throws when the browser blocks storage", () => {
    const storage = safeStorage(blocked);
    expect(storage.getItem("trip")).toBeNull();
    expect(() => storage.setItem("trip", "{}")).not.toThrow();
    expect(() => storage.removeItem("trip")).not.toThrow();
  });
});
