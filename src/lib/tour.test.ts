import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useTour } from "./tour";
import type { Profile } from "./types";

const alex: Profile = { name: "Alex", email: "alex@example.com", guest: false, provider: "email" };

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  useTour.setState({ active: false, step: 0, account: null });
});
afterEach(() => vi.unstubAllGlobals());

it("does not repeat a finished or skipped tour for the same account", () => {
  useTour.getState().start(alex);
  expect(useTour.getState().active).toBe(true);
  useTour.getState().go(5);
  useTour.getState().finish();
  useTour.getState().start({ ...alex, email: "ALEX@example.com" });
  expect(useTour.getState().active).toBe(false);
});

it("lets a different new account get its own tour", () => {
  useTour.getState().start(alex);
  useTour.getState().finish();
  useTour.getState().start({ ...alex, email: "sam@example.com" });
  expect(useTour.getState().active).toBe(true);
  expect(useTour.getState().step).toBe(0);
});

it("allows replay after completion", () => {
  useTour.getState().start(alex);
  useTour.getState().finish();
  useTour.getState().start(alex, true);
  expect(useTour.getState().active).toBe(true);
});

it("does not automatically start for guests and works without storage", () => {
  useTour.getState().start({ name: "", email: "", guest: true });
  expect(useTour.getState().active).toBe(false);
  vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
  useTour.getState().start(alex);
  expect(useTour.getState().active).toBe(true);
  expect(() => useTour.getState().finish()).not.toThrow();
});
