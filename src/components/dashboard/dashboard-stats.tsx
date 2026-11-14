import { formatBRL, plural } from "@/lib/format";
import type { Dashboard } from "@/lib/dashboard";
import { StatStrip } from "../stat-strip";
import { Stat } from "../stat";

export function DashboardStats({ stats }: { stats: Dashboard["stats"] }) {
  return (
    <StatStrip>
      <Stat label="Recebido" value={formatBRL(stats.received)}>
        <div aria-hidden="true" className="mt-0.5 h-1.5 overflow-hidden rounded-xs bg-border">
          <div className="h-full bg-ok-fill transition-[width] duration-500 ease-out" style={{ width: `${stats.receivedPct}%` }} />
        </div>
        <span>
          {stats.receivedPct}% de {formatBRL(stats.sold)} vendidos
        </span>
      </Stat>
      <Stat label="Pendente" value={formatBRL(stats.pending)} tone="warn">
        {plural(stats.pendingPeople, "pessoa", "pessoas")} para receber
      </Stat>
      <Stat label="Itens vendidos" value={String(stats.items)}>
        {plural(stats.sales, "venda registrada", "vendas registradas")}
      </Stat>
      <Stat label="Reservas" value={String(stats.reservations)}>
        {stats.reservations ? `${formatBRL(stats.reservationsAmount)} a entregar` : "nenhuma neste período"}
      </Stat>
    </StatStrip>
  );
}
