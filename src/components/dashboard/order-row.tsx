import type { ReactNode } from "react";
import { formatBRL, initials } from "@/lib/format";
import type { OrderSummary } from "@/lib/dashboard";

export function OrderRow({
  order,
  meta,
  amount,
  detail,
  avatar,
}: {
  order: OrderSummary;
  meta: string;
  amount: number;
  /** Small line below the amount. */
  detail: ReactNode;
  /** Classes of the square with the initials. */
  avatar: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-t border-border px-3.5 py-3 animate-in duration-300 fade-in slide-in-from-top-1 tablet:gap-3 tablet:px-5">
      <span
        className={`flex size-8 flex-none items-center justify-center rounded-lg text-[11px] font-semibold ${avatar}`}
      >
        {initials(order.name)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-[1.3]">
        <strong className="truncate font-semibold">{order.name}</strong>
        <span className="truncate text-[11px] text-muted-foreground">{meta}</span>
      </div>
      <div className="flex flex-col items-end leading-[1.3]">
        <strong className="font-semibold">{formatBRL(amount)}</strong>
        {detail}
      </div>
    </div>
  );
}
