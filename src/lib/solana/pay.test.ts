import { describe, expect, it } from "vitest";
import { SOLANA_CLUSTER, USDC_MINTS } from "./config";
import { buildTransferRequestUrl, fundsRequestMemo, normalizeUsdcAmount } from "./pay";

const RECIPIENT = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

function parse(url: string) {
  const match = /^solana:([^?]+)\?(.*)$/.exec(url);
  if (!match) throw new Error(`not a transfer request: ${url}`);
  const params = match[2].split("&").map((p) => {
    const [k, v] = p.split("=");
    return [k, decodeURIComponent(v)] as const;
  });
  return { recipient: match[1], keys: params.map(([k]) => k), params: Object.fromEntries(params) };
}

describe("normalizeUsdcAmount", () => {
  it.each([
    ["120", "120"],
    ["85.50", "85.5"],
    ["0.5", "0.5"],
    [".5", "0.5"],
    ["7.", "7"],
    ["007", "7"],
    [" 42 ", "42"],
    ["0.000001", "0.000001"],
    ["1000000", "1000000"],
  ])("%j -> %j", (input, expected) => {
    expect(normalizeUsdcAmount(input)).toBe(expected);
  });

  it.each(["", "0", "0.0", "-5", "1e3", "1,000", "12.3456789", "abc", "$20", "Infinity", "1.2.3"])(
    "rejects %j",
    (input) => {
      expect(normalizeUsdcAmount(input)).toBeNull();
    },
  );
});

describe("fundsRequestMemo", () => {
  it("names the trip", () => {
    expect(fundsRequestMemo("Lisbon  conference ")).toBe("Layover: Lisbon conference");
  });

  it("falls back to the app name and caps the length", () => {
    expect(fundsRequestMemo("  ")).toBe("Layover");
    expect(fundsRequestMemo("x".repeat(200))).toHaveLength(80);
  });
});

describe("buildTransferRequestUrl", () => {
  const input = {
    recipient: RECIPIENT,
    amountUsdc: "85.50",
    tripName: "Lisbon & back",
    travelerName: "Sam",
  };

  it("builds a Solana Pay USDC transfer request", () => {
    const url = buildTransferRequestUrl(input)!;
    const { recipient, keys, params } = parse(url);
    expect(recipient).toBe(RECIPIENT);
    expect(keys).toEqual(["amount", "spl-token", "label", "message", "memo"]);
    expect(params.amount).toBe("85.5");
    expect(params["spl-token"]).toBe(USDC_MINTS[SOLANA_CLUSTER]);
    expect(params.label).toBe("Layover");
    expect(params.memo).toBe("Layover: Lisbon & back");
    expect(params.message).toContain("Sam");
  });

  it("defaults to devnet and says so in the wallet message", () => {
    expect(SOLANA_CLUSTER).toBe("devnet");
    const { params } = parse(buildTransferRequestUrl(input)!);
    expect(params["spl-token"]).toBe("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
    expect(params.message).toContain("Devnet demo");
  });

  it("uses the mint for the cluster it is given", () => {
    const { params } = parse(buildTransferRequestUrl({ ...input, cluster: "mainnet-beta" })!);
    expect(params["spl-token"]).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    expect(params.message).not.toContain("Devnet");
  });

  it("percent-encodes values so they survive as one query parameter", () => {
    const url = buildTransferRequestUrl(input)!;
    expect(url).toContain("memo=Layover%3A%20Lisbon%20%26%20back");
    expect(url).not.toContain("+");
    expect(url).not.toContain(" ");
  });

  it("returns null instead of throwing for a bad recipient or amount", () => {
    expect(buildTransferRequestUrl({ ...input, recipient: "not-an-address" })).toBeNull();
    expect(buildTransferRequestUrl({ ...input, recipient: ` ${RECIPIENT}` })).toBeNull();
    expect(buildTransferRequestUrl({ ...input, amountUsdc: "0" })).toBeNull();
    expect(buildTransferRequestUrl({ ...input, amountUsdc: "1e2" })).toBeNull();
  });
});
