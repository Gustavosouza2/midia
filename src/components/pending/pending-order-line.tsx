import { cn } from "cn";
import { PayButtons } from "@/components/pay-buttons";
import { formatBRL } from "@/lib/format";
import type { PaymentMethod, PendingOrder } from "@/lib/pending";
import { AgeBadge } from "./age-badge";
import { PaidStatus } from "./paid-status";

/**
 * One order under a person who owes more than one. Its own pay buttons are secondary (smaller,
 * after the order) and hide once the whole person is paid.
 */
export function PendingOrderLine({
  name,
  order,
  personPaid,
  saving,
  onPay,
  onUndo,
}: {
  name: string;
  order: PendingOrder;
  personPaid: boolean;
  saving: boolean;
  onPay: (method: PaymentMethod) => void;
  onUndo: (paymentId: string) => void;
}) {
  const { state } = order;
  const paid = state.type === "paid";
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 first:pt-0 last:pb-0">
      <div className="flex min-w-0 grow basis-36 flex-col leading-[1.3]">
        <span className={cn("truncate text-[13px]", paid && "text-muted-foreground line-through")}>
          {order.items}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {order.day}
          <AgeBadge ageDays={order.ageDays} muted={paid} />
        </span>
      </div>
      <strong className={cn("text-[13px] font-semibold", paid && "text-muted-foreground")}>
        {formatBRL(order.amount)}
      </strong>
      {personPaid ? null : state.type === "paid" ? (
        <PaidStatus method={state.method} disabled={saving} onUndo={() => onUndo(state.paymentId)} />
      ) : (
        <PayButtons
          subject={`${name}: ${order.items} de ${order.day}`}
          disabled={saving}
          onPay={onPay}
          buttonClassName="h-10 text-xs tablet:h-[30px]"
        />
      )}
    </li>
  );
}
