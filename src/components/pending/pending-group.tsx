import { Card } from "@/components/ui/card";
import { formatBRL, plural } from "@/lib/format";
import type { PendingGroupData } from "@/lib/pending";
import { PendingRow } from "./pending-row";

export function PendingGroup({
  group,
  choosing,
  onSelect,
  onReceive,
}: {
  group: PendingGroupData;
  /** Order with the Pix · Dinheiro choice open. */
  choosing: string | null;
  onSelect: (orderId: string | null) => void;
  onReceive: (orderId: string, paymentId: string) => void;
}) {
  return (
    <Card role="region" aria-label={group.title}>
      <div className="flex items-center justify-between gap-3 bg-muted px-3.5 py-2.5 tablet:px-5 tablet:py-3.5">
        <div className="flex items-center gap-2 tablet:gap-2.5">
          <i className={`size-2 rounded-full ${group.key === "old" ? "bg-warn" : "bg-muted-foreground"}`} />
          <h2 className="text-xs font-semibold tablet:text-sm">{group.title}</h2>
          <span className="hidden text-[11px] text-muted-foreground tablet:inline">
            {plural(group.people, "pessoa", "pessoas")}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground tablet:text-[13px] tablet:font-semibold tablet:text-foreground">
          {formatBRL(group.total)}
          <span className="tablet:hidden"> em aberto</span>
        </span>
      </div>
      {group.rows.map((row) => (
        <PendingRow
          key={row.orderId}
          row={row}
          choosing={choosing === row.orderId}
          onOpen={() => onSelect(row.orderId)}
          onClose={() => onSelect(null)}
          onReceive={(paymentId) => onReceive(row.orderId, paymentId)}
        />
      ))}
    </Card>
  );
}
