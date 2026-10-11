import { describe, expect, it } from "vitest";
import { isValidSolanaAddress, normalizeSolanaAddress, SolanaAddressSchema } from "./address";
import { USDC_MINTS } from "./config";

describe("isValidSolanaAddress", () => {
  it.each([
    ["token program", "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
    ["devnet USDC mint", USDC_MINTS.devnet],
    ["mainnet USDC mint", USDC_MINTS["mainnet-beta"]],
    ["memo program", "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"],
  ])("accepts %s", (_, address) => {
    expect(isValidSolanaAddress(address)).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["32 zero bytes (the system program, not a wallet)", "1".repeat(32)],
    ["31 zero bytes", "1".repeat(31)],
    ["33 zero bytes", "1".repeat(33)],
    ["more than 32 bytes", "z".repeat(44)],
    ["a non-base58 0", "0okenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
    ["a non-base58 O", "OokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
    ["a non-base58 I", "IokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
    ["a non-base58 l", "lokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
    ["too short", "TokenkegQfeZyiNwAJbNbGKPFXCWuBv"],
    ["an Ethereum address", "0x52908400098527886E0F7030069857D2E4169EE7"],
    ["surrounding whitespace", ` ${USDC_MINTS.devnet} `],
    ["a solana: URL", `solana:${USDC_MINTS.devnet}`],
  ])("rejects %s", (_, address) => {
    expect(isValidSolanaAddress(address)).toBe(false);
  });
});

describe("normalizeSolanaAddress", () => {
  it("trims pasted input", () => {
    expect(normalizeSolanaAddress(`  ${USDC_MINTS.devnet}\n`)).toBe(USDC_MINTS.devnet);
  });

  it("returns null for invalid input", () => {
    expect(normalizeSolanaAddress("not an address")).toBeNull();
    expect(normalizeSolanaAddress("   ")).toBeNull();
  });
});

describe("SolanaAddressSchema", () => {
  it("validates like isValidSolanaAddress", () => {
    expect(SolanaAddressSchema.safeParse(USDC_MINTS.devnet).success).toBe(true);
    expect(SolanaAddressSchema.safeParse("nope").success).toBe(false);
  });
});
