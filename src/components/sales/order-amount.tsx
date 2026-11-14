import { formatBRL } from "@/lib/format";
import type { DayOrder } from "@/lib/sales";

export function OrderAmount({ order }: { order: DayOrder }) {
  const detail =
    order.status === "pending" && order.due < order.amount
      ? `falta ${formatBRL(order.due)}`
      : order.unitPrice !== null && `${formatBRL(order.unitPrice)} cada`;
  return (
    <span className="flex flex-col items-end leading-[1.3]">
      <span>{formatBRL(order.amount)}</span>
      {detail && <span className="text-[11px] text-muted-foreground">{detail}</span>}
    </span>
  );
}
