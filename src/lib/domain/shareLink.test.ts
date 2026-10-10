import { describe, expect, it } from "vitest";
import { sampleTrip } from "@/lib/sampleTrip";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { buildTransferRequestUrl } from "@/lib/solana/pay";
import type { Trip } from "@/lib/types";
import { decodeShare, encodeShare } from "./shareLink";
import { DEFAULT_SUMMARY_OPTIONS } from "./summary";

const ADDRESS = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

function tripWithDisruption(payoutAddress?: string): Trip {
  return {
    ...structuredClone(sampleTrip),
    ...(payoutAddress ? { payoutAddress } : {}),
    disruptions: [
      {
        id: "d1",
        type: "delay",
        flightId: sampleTrip.flights[0].id,
        createdAt: "2026-10-17T08:00:00.000Z",
        tasks: [],
      },
    ],
  };
}

describe("share link fundsRequest", () => {
  it("is absent by default, so the core link is unchanged", () => {
    const snapshot = decodeShare(encodeShare(tripWithDisruption(ADDRESS), "d1", DEFAULT_SUMMARY_OPTIONS));
    expect(snapshot).not.toBeNull();
    expect(snapshot!.fundsRequest).toBeUndefined();
  });

  it("round-trips recipient, canonical amount and cluster", () => {
    const options = { ...DEFAULT_SUMMARY_OPTIONS, fundsRequest: { amountUsdc: "120.50" } };
    const snapshot = decodeShare(encodeShare(tripWithDisruption(ADDRESS), "d1", options))!;
    expect(snapshot.fundsRequest).toEqual({
      recipient: ADDRESS,
      amountUsdc: "120.5",
      cluster: "devnet",
    });
    const url = buildTransferRequestUrl({
      ...snapshot.fundsRequest!,
      tripName: snapshot.tripName,
      travelerName: snapshot.travelerName,
    });
    expect(url).toMatch(new RegExp(`^solana:${ADDRESS}\\?amount=120\\.5&`));
  });

  it("is left out when there is no payout address or the amount is invalid", () => {
    const withAmount = { ...DEFAULT_SUMMARY_OPTIONS, fundsRequest: { amountUsdc: "50" } };
    expect(decodeShare(encodeShare(tripWithDisruption(), "d1", withAmount))!.fundsRequest).toBeUndefined();

    const badAmount = { ...DEFAULT_SUMMARY_OPTIONS, fundsRequest: { amountUsdc: "-5" } };
    expect(decodeShare(encodeShare(tripWithDisruption(ADDRESS), "d1", badAmount))!.fundsRequest).toBeUndefined();
  });

  it("drops a tampered fundsRequest but still shows the update", () => {
    const options = { ...DEFAULT_SUMMARY_OPTIONS, fundsRequest: { amountUsdc: "50" } };
    // encodeShare swaps lz-string's "+" and "$" for "_" and "~"; undo that to read the raw JSON.
    const fragment = encodeShare(tripWithDisruption(ADDRESS), "d1", options);
    const json = JSON.parse(
      decompressFromEncodedURIComponent(fragment.replace(/_/g, "+").replace(/~/g, "$"))!,
    );
    json.fundsRequest.recipient = "0xdeadbeef";
    const snapshot = decodeShare(
      compressToEncodedURIComponent(JSON.stringify(json)).replace(/\+/g, "_").replace(/\$/g, "~"),
    );
    expect(snapshot?.tripName).toBe(sampleTrip.name);
    expect(snapshot?.fundsRequest).toBeUndefined();
  });
});
