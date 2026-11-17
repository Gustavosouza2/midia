"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getLocalDb } from "@/local-db";
import { cancelOrder } from "@/local-db/writes";
import { formatBRL } from "@/lib/format";
import type { Placed } from "./checkout";

const SHOWN_MS = 6000;
const PAID_WITH = { pix: "no Pix", dinheiro: "em dinheiro", pending: "pendente" } as const;

/**
 * Confirms the order just recorded and offers "Desfazer" for a few seconds: a mistake costs one tap,
 * and undoing puts the items back in the order.
 */
export function PlacedToast({
  placed,
  onDismiss,
  onUndone,
}: {
  placed: Placed;
  onDismiss: () => void;
  onUndone: (placed: Placed) => void;
}) {
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(onDismiss, SHOWN_MS);
    return () => clearTimeout(timer);
  }, [placed, onDismiss]);

  async function undo() {
    setUndoing(true);
    await cancelOrder(getLocalDb(), placed.orderId);
    onUndone(placed);
  }

  const what = placed.draft.type === "reservation" ? "Reserva feita" : "Venda registrada";
  const who = placed.draft.name.trim() ? ` · ${placed.draft.name.trim()}` : "";

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-[14px] bg-primary py-2 pr-2 pl-3.5 text-primary-foreground shadow-[0_8px_24px_rgba(17,17,19,0.25)] animate-in duration-300 fade-in slide-in-from-bottom-3 tablet:inset-x-auto tablet:right-6 tablet:bottom-6 tablet:w-[380px]"
    >
      <span className="flex size-7 flex-none items-center justify-center rounded-full bg-ok-fill">
        <Check className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-xs leading-[1.35]">
        <strong className="font-semibold">{what}</strong>
        <span className="block truncate opacity-75">
          {formatBRL(placed.total)} {PAID_WITH[placed.payment]}
          {who}
        </span>
      </span>
      <Button
        variant="outline"
        disabled={undoing}
        onClick={undo}
        className="h-9 rounded-[9px] border-0 px-3 font-semibold"
      >
        Desfazer
      </Button>
    </div>
  );
}
