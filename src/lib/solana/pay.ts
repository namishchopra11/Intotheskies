import { z } from "zod";
import { isValidSolanaAddress } from "./address";
import {
  isDemoCluster,
  SOLANA_CLUSTER,
  USDC_DECIMALS,
  USDC_MINTS,
  type SolanaCluster,
} from "./config";

// Builds Solana Pay transfer request URLs (https://docs.solanapay.com/spec).
// The app only generates a request; the contact's wallet composes, signs and sends.
// There is deliberately no key handling or signing anywhere in this app.

const AMOUNT_INPUT = new RegExp(`^(\\d+(\\.\\d{0,${USDC_DECIMALS}})?|\\.\\d{1,${USDC_DECIMALS}})$`);

/**
 * Turns what the traveler typed into a canonical USDC amount ("12.50" -> "12.5",
 * ".5" -> "0.5", "007" -> "7"). Returns null for zero, negatives, anything that is
 * not a plain decimal, or more than 6 decimal places (the spec says wallets must
 * reject those).
 */
export function normalizeUsdcAmount(input: string): string | null {
  const trimmed = input.trim();
  if (!AMOUNT_INPUT.test(trimmed)) return null;
  const [whole = "", fraction = ""] = trimmed.split(".");
  const wholePart = whole.replace(/^0+/, "") || "0";
  const fractionPart = fraction.replace(/0+$/, "");
  if (wholePart === "0" && fractionPart === "") return null;
  return fractionPart ? `${wholePart}.${fractionPart}` : wholePart;
}

/** A canonical, positive USDC amount as produced by normalizeUsdcAmount. */
export const UsdcAmountSchema = z
  .string()
  .refine((s) => normalizeUsdcAmount(s) === s, "Not a valid USDC amount");

const APP_LABEL = "ConnectionKeeper";
const MEMO_MAX_LENGTH = 80;

/** The memo names the trip. It is stored on-chain publicly, so it carries nothing else. */
export function fundsRequestMemo(tripName: string): string {
  const name = tripName.trim().replace(/\s+/g, " ");
  const memo = name ? `${APP_LABEL}: ${name}` : APP_LABEL;
  return memo.length > MEMO_MAX_LENGTH ? `${memo.slice(0, MEMO_MAX_LENGTH - 3)}...` : memo;
}

export type TransferRequestInput = {
  recipient: string; // the traveler's payoutAddress
  amountUsdc: string; // any input normalizeUsdcAmount accepts
  tripName: string;
  travelerName: string;
  cluster?: SolanaCluster; // defaults to SOLANA_CLUSTER
};

/**
 * Returns a `solana:` transfer request for USDC, or null if the recipient or amount
 * is invalid. Never throws, so a bad value can't break the page that renders it.
 */
export function buildTransferRequestUrl(input: TransferRequestInput): string | null {
  const cluster = input.cluster ?? SOLANA_CLUSTER;
  const amount = normalizeUsdcAmount(input.amountUsdc);
  if (!isValidSolanaAddress(input.recipient) || !amount) return null;

  const traveler = input.travelerName.trim() || "A traveler";
  const message = `${traveler} is asking for help with travel costs.${
    isDemoCluster(cluster) ? " Devnet demo, not real money." : ""
  }`;

  // encodeURIComponent rather than URLSearchParams: some wallets show "+" literally.
  const params: [string, string][] = [
    ["amount", amount],
    ["spl-token", USDC_MINTS[cluster]],
    ["label", APP_LABEL],
    ["message", message],
    ["memo", fundsRequestMemo(input.tripName)],
  ];
  const query = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  return `solana:${input.recipient}?${query}`;
}
