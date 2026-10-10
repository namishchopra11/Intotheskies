import { z } from "zod";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58_INDEX = new Map([...BASE58_ALPHABET].map((c, i) => [c, BigInt(i)]));

/** Decodes a base58 string to bytes, or returns null if it contains a non-base58 character. */
function decodeBase58(input: string): Uint8Array | null {
  let value = BigInt(0);
  for (const char of input) {
    const digit = BASE58_INDEX.get(char);
    if (digit === undefined) return null;
    value = value * BigInt(58) + digit;
  }
  const body: number[] = [];
  while (value > BigInt(0)) {
    body.unshift(Number(value % BigInt(256)));
    value /= BigInt(256);
  }
  // Each leading "1" encodes one leading zero byte.
  const leadingZeros = input.length - input.replace(/^1+/, "").length;
  return Uint8Array.from([...new Array<number>(leadingZeros).fill(0), ...body]);
}

/**
 * True if `input` is a Solana public key: base58 that decodes to exactly 32 bytes.
 * Strict: surrounding whitespace makes it invalid (use normalizeSolanaAddress for input).
 */
export function isValidSolanaAddress(input: string): boolean {
  // 32 bytes is 32 to 44 base58 characters; checking length first keeps the decode cheap.
  if (input.length < 32 || input.length > 44) return false;
  return decodeBase58(input)?.length === 32;
}

/** Trims user input. Returns the address if valid, otherwise null. */
export function normalizeSolanaAddress(input: string): string | null {
  const trimmed = input.trim();
  return isValidSolanaAddress(trimmed) ? trimmed : null;
}

export const SolanaAddressSchema = z
  .string()
  .refine(isValidSolanaAddress, "Not a valid Solana address");
