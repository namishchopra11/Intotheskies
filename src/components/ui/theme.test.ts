import { describe, expect, it } from "vitest";
import { themeScript } from "./theme";

function run(openingSeen: boolean) {
  const attrs: Record<string, string> = {};
  const env: Record<string, unknown> = {
    window: { matchMedia: () => ({ matches: false, addEventListener() {} }) },
    localStorage: { getItem: () => null },
    sessionStorage: { getItem: () => (openingSeen ? "1" : null) },
    document: {
      documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) },
      querySelectorAll: () => [],
      addEventListener() {},
    },
  };
  new Function(...Object.keys(env), themeScript)(...Object.values(env));
  return attrs;
}

describe("themeScript", () => {
  it("marks the document when the opening already played in this tab", () => {
    expect(run(true)["data-opening-seen"]).toBe("");
  });

  it("leaves the opening to play on a fresh tab", () => {
    expect(run(false)).not.toHaveProperty("data-opening-seen");
  });

  it("still applies the theme either way", () => {
    expect(run(false)["data-theme"]).toBe("light");
  });
});
