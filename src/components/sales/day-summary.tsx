import { Card } from "@/components/ui/card";
import { formatBRL, plural } from "@/lib/format";
import type { SalesScreen } from "@/lib/sales";

/** The day in one line: what was sold, what came in, what is still owed and what is reserved. */
export function DaySummary({ stats }: { stats: SalesScreen["stats"] }) {
  const cells: [string, string, string, boolean][] = [
    ["Vendido", formatBRL(stats.sold), plural(stats.items, "item", "itens"), false],
    ["Recebido", formatBRL(stats.received), stats.sold ? `${Math.round((stats.received / stats.sold) * 100)}%` : "—", false],
    ["Pendente", formatBRL(stats.pending), stats.pendingOrders ? plural(stats.pendingOrders, "pedido", "pedidos") : "nada em aberto", stats.pending > 0],
    ["Reservas", String(stats.reservations), stats.reservations ? formatBRL(stats.reservationsAmount) : "nenhuma", false],
  ];
  return (
    <Card aria-label="Resumo do dia" className="grid grid-cols-2 gap-px bg-border tablet:grid-cols-4">
      {cells.map(([label, value, detail, warn]) => (
        <div key={label} className="flex flex-col gap-0.5 bg-background px-3.5 py-2.5 tablet:px-4">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <span className="flex items-baseline gap-1.5">
            <strong className={`text-base font-semibold tabular-nums ${warn ? "text-warn" : ""}`}>{value}</strong>
            <span className="truncate text-[11px] text-muted-foreground">{detail}</span>
          </span>
        </div>
      ))}
    </Card>
  );
}
