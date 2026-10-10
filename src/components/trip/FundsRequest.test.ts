import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildTransferRequestUrl } from "@/lib/solana/pay";
import { FundsRequest, type FundsRequestProps } from "./FundsRequest";

const props: FundsRequestProps = {
  recipient: "7ZhdYtCR8MMnHd3zB2s3MHZuhU7rupW3DfYDLpEqPA8q",
  amountUsdc: "120",
  tripName: "Rome via London",
  travelerName: "Sam Rivera",
  cluster: "devnet",
};
const render = (p: FundsRequestProps) => renderToStaticMarkup(createElement(FundsRequest, p));

describe("FundsRequest", () => {
  it("renders the wallet link, a QR code and the devnet label", () => {
    const html = render(props);
    const url = buildTransferRequestUrl(props)!;
    expect(html).toContain(`href="${url.replaceAll("&", "&amp;")}"`);
    expect(html).toContain("<svg");
    expect(html).toContain("Solana Pay request for 120 USDC");
    expect(html).toContain("Sam is asking for");
    expect(html).toContain("devnet");
  });

  it("drops the devnet label for mainnet", () => {
    expect(render({ ...props, cluster: "mainnet-beta" })).not.toContain("test network");
  });

  it("renders nothing for an invalid request, so the page around it still works", () => {
    expect(render({ ...props, recipient: "not-an-address" })).toBe("");
    expect(render({ ...props, amountUsdc: "0" })).toBe("");
  });
});
