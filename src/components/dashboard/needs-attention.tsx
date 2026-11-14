import { plural, shortDate } from "@/lib/format";
import type { OrderSummary } from "@/lib/dashboard";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Group } from "./group";
import { Age } from "./age";
import { OrderRow } from "./order-row";

/** How many pending orders the Dashboard shows; the rest stay on the Pending screen. */
const VISIBLE_PENDING = 3;

export function NeedsAttention({
  reservations,
  pending,
  pendingPeople,
}: {
  reservations: OrderSummary[];
  /** Oldest first. */
  pending: OrderSummary[];
  pendingPeople: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Precisa de atenção</CardTitle>
        <CardDescription className="hidden tablet:block">Reservas a entregar e pendentes antigos</CardDescription>
      </CardHeader>
      {reservations.length > 0 && (
        <>
          <Group color="bg-text-2" title="Reservas para entregar" count={String(reservations.length)} />
          {reservations.map((r) => (
            <OrderRow
              key={r.id}
              order={r}
              meta={r.description}
              amount={r.amount}
              detail={<span className="text-[11px] text-muted-foreground">para {shortDate(r.date)}</span>}
              avatar="bg-accent"
            />
          ))}
        </>
      )}

      <Group color="bg-warn" title="Pendentes há mais tempo" count={plural(pendingPeople, "pessoa", "pessoas")} />
      {pending.length === 0 ? (
        <p className="border-t border-border px-3.5 py-4 text-[11px] text-muted-foreground tablet:px-5">
          Ninguém devendo neste período.
        </p>
      ) : (
        <>
          {pending.slice(0, VISIBLE_PENDING).map((p) => (
            <OrderRow
              key={p.id}
              order={p}
              meta={`${p.description} · ${shortDate(p.date)}`}
              amount={p.due}
              detail={<Age days={p.ageDays} />}
              avatar="border border-border bg-muted"
            />
          ))}
          <CardFooter className="p-0 tablet:p-0">
            <Link transitionTypes={["screen"]}
              href="/pending"
              className="flex w-full items-center justify-between px-3.5 py-3 text-xs text-text-2 hover:bg-accent tablet:px-5"
            >
              Ver todos os pendentes ({pending.length})
              <ArrowRight className="size-3.5" />
            </Link>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
