import { Card } from "@/components/ui/card";
import { formatBRL, plural } from "@/lib/format";
import type { Pending } from "@/lib/pending";
import { StatStrip } from "../stat-strip";
import { Stat } from "../stat";

/** Strip of 4 stats on tablet and desktop; a summary card on the phone. */
export function PendingStats({ stats }: { stats: Pending["stats"] }) {
  return (
    <>
      <div role="region" aria-label="Números" className="hidden tablet:order-2 tablet:block">
        <StatStrip>
          <Stat label="Em aberto" value={formatBRL(stats.outstanding)} tone="warn">
            {plural(stats.outstandingOrders, "pedido", "pedidos")} sem pagar
          </Stat>
          <Stat label="Pessoas devendo" value={String(stats.people)}>
            neste período
          </Stat>
          <Stat label="Há mais de 2 semanas" value={String(stats.overduePeople)}>
            {stats.overduePeople ? `${formatBRL(stats.overdueAmount)} em aberto` : "ninguém atrasado"}
          </Stat>
          <Stat label="Recebido agora" value={formatBRL(stats.receivedNow)}>
            hoje, de quem estava pendente
          </Stat>
        </StatStrip>
      </div>

      <Card
        role="region"
        aria-label="Resumo"
        className="order-2 flex-row items-end justify-between gap-3 p-4 tablet:hidden"
      >
        <div className="flex flex-col">
          <span className="text-[11px] text-muted-foreground">Em aberto</span>
          <strong className="text-[26px] leading-[1.15] font-semibold tracking-[-0.02em] text-warn">
            {formatBRL(stats.outstanding)}
          </strong>
          <span className="text-[11px] text-muted-foreground">
            {plural(stats.people, "pessoa", "pessoas")} · {stats.overduePeople} há mais de 2 semanas
          </span>
        </div>
        <div className="flex flex-none flex-col items-end">
          <span className="text-[11px] whitespace-nowrap text-muted-foreground">Recebido agora</span>
          <strong className="text-[15px] font-semibold text-foreground">{formatBRL(stats.receivedNow)}</strong>
        </div>
      </Card>
    </>
  );
}
