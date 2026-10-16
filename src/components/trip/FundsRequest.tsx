"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { copyText } from "@/app/share/[id]/copyText";
import { Button, buttonClasses, Card, Icon, SignArrow } from "@/components/ui";
import { isDemoCluster, SOLANA_CLUSTER, type SolanaCluster } from "@/lib/solana/config";
import { buildTransferRequestUrl } from "@/lib/solana/pay";

export type FundsRequestProps = {
  recipient: string; // the traveler's payoutAddress
  amountUsdc: string; // e.g. "120" or "85.5"
  tripName: string; // goes in the on-chain memo
  travelerName: string;
  cluster?: SolanaCluster; // the cluster the link was made for; defaults to SOLANA_CLUSTER
  className?: string;
};

/**
 * A Solana Pay request for USDC: the amount, a button that opens the reader's wallet,
 * a QR code to scan from another device, and the address to copy by hand.
 *
 * It only shows a request. The reader's wallet builds, signs and sends the payment;
 * nothing here holds keys or sends anything. Renders nothing if the request is invalid.
 *
 * On /s:
 *   {s.fundsRequest && (
 *     <FundsRequest {...s.fundsRequest} tripName={s.tripName} travelerName={s.travelerName} />
 *   )}
 */
export function FundsRequest({
  recipient,
  amountUsdc,
  tripName,
  travelerName,
  cluster = SOLANA_CLUSTER,
  className = "",
}: FundsRequestProps) {
  const [copied, setCopied] = useState<boolean | null>(null);
  const url = buildTransferRequestUrl({ recipient, amountUsdc, tripName, travelerName, cluster });
  if (!url) return null;

  const demo = isDemoCluster(cluster);
  const first = travelerName.trim().split(/\s+/)[0] || "The traveler";
  return (
    <Card className={className}>
      <p className="text-[16px] font-semibold text-ink-2">{first} is asking for</p>
      <p className="mt-1 font-display text-[64px] leading-[0.9] font-bold">
        {amountUsdc} <span className="font-sans text-[18px] font-bold text-ink-2">USDC</span>
      </p>
      {demo && (
        <p className="mt-3 flex items-start gap-2 rounded-control bg-warn-bg px-3 py-2.5 text-[15px] font-semibold text-warn-fg">
          <Icon name="info" size={18} className="mt-px" />
          Devnet test network. No real money.
        </p>
      )}

      <a href={url} className={buttonClasses({ variant: "primary", size: "lg", block: true, chip: true, className: "mt-4" })}>
        Send help
        <span aria-hidden="true" className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[3px] bg-on-sign text-sign">
          <SignArrow size={24} className="ck-key-arrow" />
        </span>
      </a>
      <p className="mt-2 text-[14px] font-medium text-ink-2">Opens your wallet{demo ? " (on devnet)" : ""}. You approve it there.</p>

      <div className="mt-5 flex flex-col items-center gap-2 pt-1">
        <p className="self-start text-[15px] font-bold">Or scan with your wallet</p>
        {/* Always dark on white, even in dark mode, so every scanner can read it. */}
        <div className="rounded-control bg-white p-3">
          <QRCodeSVG
            value={url}
            size={208}
            level="M"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#000000"
            title={`Solana Pay request for ${amountUsdc} USDC`}
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[15px] font-bold">Or send to this address</p>
        <p className="mt-1 font-num text-[15px] break-all text-ink-2">{recipient}</p>
        <Button
          size="sm"
          variant="plate"
          className="mt-2"
          icon={copied ? "check" : "copy"}
          onClick={async () => setCopied(await copyText(recipient))}
        >
          {copied ? "Copied" : copied === false ? "Couldn't copy" : "Copy address"}
        </Button>
      </div>
    </Card>
  );
}
