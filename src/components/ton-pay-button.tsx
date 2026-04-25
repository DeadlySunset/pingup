"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  TonConnectButton,
  useTonConnectUI,
  useTonWallet,
} from "@tonconnect/ui-react";
import { beginCell } from "@ton/core";

// Encode a TON text comment into a Cell bag-of-cells base64 payload.
// Spec: first 32 bits = 0x00000000 opcode ("text comment"), then UTF-8 tail.
function buildCommentPayload(comment: string): string {
  return beginCell()
    .storeUint(0, 32)
    .storeStringTail(comment)
    .endCell()
    .toBoc()
    .toString("base64");
}

type Props = {
  address: string;
  amountTon: number;
  comment: string;
};

export function TonPayButton({ address, amountTon, comment }: Props) {
  const t = useTranslations("subscribe");
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePay = async () => {
    setStatus("sending");
    setErrorMsg(null);
    try {
      const amountNano = Math.round(amountTon * 1e9).toString();
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address,
            amount: amountNano,
            payload: buildCommentPayload(comment),
          },
        ],
      });
      setStatus("sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // User-rejected in wallet is not a real error — keep UI calm.
      if (/cancel|reject|declin/i.test(msg)) {
        setStatus("idle");
      } else {
        setStatus("error");
        setErrorMsg(msg);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <TonConnectButton className="!w-full" />

      {wallet && status !== "sent" && (
        <button
          type="button"
          onClick={handlePay}
          disabled={status === "sending"}
          className="w-full rounded-md bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 transition-all duration-200 hover:bg-orange-700 hover:shadow-xl hover:shadow-orange-700/30 active:scale-[0.98] disabled:opacity-60 dark:bg-amber-500 dark:text-black dark:shadow-amber-900/40 dark:hover:bg-amber-400"
        >
          {status === "sending"
            ? t("paySending")
            : t("payNow", { amount: amountTon.toFixed(2) })}
        </button>
      )}

      {status === "sent" && (
        <p className="text-xs text-emerald-700 dark:text-emerald-300">{t("payBroadcast")}</p>
      )}
      {status === "error" && errorMsg && (
        <p className="text-xs text-red-700 dark:text-red-300">
          {t("payError")}: {errorMsg}
        </p>
      )}
    </div>
  );
}
