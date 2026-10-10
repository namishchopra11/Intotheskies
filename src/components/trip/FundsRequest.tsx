"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { copyText } from "@/app/share/[id]/copyText";
import { Button, buttonClasses, Card, Icon } from "@/components/ui";
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
      <p className="text-ink-2">{first} is asking for</p>
      <p className="font-num text-[30px] leading-tight font-semibold tabular-nums">
        {amountUsdc} <span className="font-sans text-[17px] font-medium text-ink-2">USDC</span>
      </p>
      {demo && (
        <p className="mt-3 flex items-start gap-2 rounded-control bg-warn-bg px-3 py-2.5 text-[14px] text-warn-fg">
          <Icon name="info" size={18} className="mt-px" />
          Demo on Solana&apos;s test network (devnet). No real money moves.
        </p>
      )}

      <a href={url} className={buttonClasses({ variant: "primary", block: true, className: "mt-4" })}>
        <Icon name="arrow-right" size={20} />
        Send help
      </a>
      <p className="mt-2 text-[14px] leading-snug text-ink-3">
        Opens your Solana wallet app{demo ? " (set it to devnet)" : ""}. You check and approve the
        payment there. Nothing is sent from this page.
      </p>

      <div className="mt-4 flex flex-col items-center gap-2 border-t border-line pt-4">
        <p className="self-start text-[13px] text-ink-3">Wallet on another device? Scan this with it</p>
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

      <div className="mt-4 border-t border-line pt-3">
        <p className="text-[13px] text-ink-3">No wallet app? Send to this address</p>
        <p className="mt-1 font-num text-[14px] break-all text-ink-2">{recipient}</p>
        <Button
          size="sm"
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
