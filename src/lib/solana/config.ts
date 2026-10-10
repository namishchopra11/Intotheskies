import { z } from "zod";

// The one switch for the "request funds" add-on. Everything that builds or labels a
// Solana Pay request reads it from here. Keep it on devnet: this is a demo.
export const SOLANA_CLUSTER: SolanaCluster = "devnet";

export const SolanaClusterSchema = z.enum(["devnet", "mainnet-beta"]);
export type SolanaCluster = z.infer<typeof SolanaClusterSchema>;

// Circle's USDC mints. The devnet one only exists on devnet, so a devnet request
// cannot move real money even if a wallet is pointed at mainnet.
export const USDC_MINTS: Record<SolanaCluster, string> = {
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "mainnet-beta": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

export const USDC_DECIMALS = 6;

export function isDemoCluster(cluster: SolanaCluster): boolean {
  return cluster !== "mainnet-beta";
}
