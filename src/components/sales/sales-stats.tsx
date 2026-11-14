import { formatBRL, plural } from "@/lib/format";
import type { SalesScreen } from "@/lib/sales";
import { StatStrip } from "../stat-strip";
import { Stat } from "../stat";

export function SalesStats({ stats }: { stats: SalesScreen["stats"] }) {
  return (
    <StatStrip>
      <Stat label="Itens vendidos" value={String(stats.items)}>
        {formatBRL(stats.sold)} no total
      </Stat>
      <Stat label="Recebido" value={formatBRL(stats.received)}>
        {stats.sold ? `${Math.round((stats.received / stats.sold) * 100)}% do vendido` : "nada vendido ainda"}
      </Stat>
      <Stat label="Pendente" value={formatBRL(stats.pending)} tone="warn">
        {stats.pendingOrders
          ? `${plural(stats.pendingOrders, "pedido", "pedidos")} em aberto`
          : "nada em aberto"}
      </Stat>
      <Stat label="Reservas" value={String(stats.reservations)}>
        {stats.reservations
          ? `${plural(stats.reservedItems, "item", "itens")} · ${formatBRL(stats.reservationsAmount)}`
          : "nenhuma para este dia"}
      </Stat>
    </StatStrip>
  );
}
