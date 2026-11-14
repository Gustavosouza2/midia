import { formatBRL } from "@/lib/format";
import type { BoardColumn, OrderStatus } from "@/lib/sales";
import { Card } from "@/components/ui/card";
import { OrderActions } from "./order-actions";

const COLUMN: Record<OrderStatus, { title: string; color: string }> = {
  reserved: { title: "Reservas", color: "bg-text-2" },
  pending: { title: "Pendentes", color: "bg-warn" },
  paid: { title: "Pagos", color: "bg-ok" },
};

/** Board: Reservas → Pendentes → Pagos. The pending total is what is left to receive. */
export function OrderBoard({ columns }: { columns: BoardColumn[] }) {
  return (
    <div className="grid items-start gap-3.5 wide:grid-cols-3">
      {columns.map(({ status, orders, total }) => (
        <section
          key={status}
          aria-label={COLUMN[status].title}
          className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-muted p-3"
        >
          <div className="flex items-center justify-between px-1 py-0.5">
            <span className="inline-flex items-center gap-2 font-semibold">
              <i className={`size-2 rounded-full ${COLUMN[status].color}`} />
              {COLUMN[status].title}
              <span className="text-[11px] font-normal text-muted-foreground">{orders.length}</span>
            </span>
            <span className="text-[11px] text-muted-foreground">{formatBRL(total)}</span>
          </div>
          {orders.map((p) => (
            <Card key={p.id} className="gap-2 px-3.5 py-3">
              <div className="flex justify-between gap-2">
                <strong className="truncate font-semibold">{p.name}</strong>
                <strong className="font-semibold">{formatBRL(p.amount)}</strong>
              </div>
              <span className="text-[11px] text-text-2">{p.description}</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {p.time}
                  {status === "pending" && p.due < p.amount && ` · falta ${formatBRL(p.due)}`}
                </span>
                <OrderActions order={p} placement="board" />
              </div>
            </Card>
          ))}
          {orders.length === 0 && (
            <p className="rounded-[10px] border border-dashed border-input p-[18px] text-center text-xs text-muted-foreground">
              Nenhum pedido aqui
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
