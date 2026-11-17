import { cn } from "cn";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import type { Pending } from "@/lib/pending";

/** The three numbers that answer "how much is owed, by how many, and who is late". */
export function PendingStats({ stats }: { stats: Pending["stats"] }) {
  return (
    <Card
      role="region"
      aria-label="Resumo"
      className="flex-row flex-wrap items-end justify-between gap-x-8 gap-y-3 p-4 tablet:px-5"
    >
      <div className="flex flex-col">
        <span className="text-[11px] text-muted-foreground">Em aberto</span>
        <strong className="text-[26px] leading-[1.15] font-semibold tracking-[-0.02em] text-warn">
          {formatBRL(stats.outstanding)}
        </strong>
      </div>
      <dl className="flex gap-6">
        <div className="flex flex-col">
          <dt className="text-[11px] text-muted-foreground">Pessoas</dt>
          <dd className="text-[15px] font-semibold">{stats.people}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-[11px] text-muted-foreground">Há mais de 2 semanas</dt>
          <dd className={cn("text-[15px] font-semibold", stats.overduePeople > 0 && "text-warn")}>
            {stats.overduePeople}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
