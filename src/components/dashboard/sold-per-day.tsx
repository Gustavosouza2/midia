import Link from "next/link";
import type { Period, DaySummary } from "@/lib/dashboard";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Legend } from "./legend";
import { DayRow } from "./day-row";

export function SoldPerDay({
  days,
  period,
  onSelect,
}: {
  days: DaySummary[];
  period: Period;
  onSelect: (period: Period) => void;
}) {
  const maxSold = Math.max(1, ...days.map((d) => d.sold));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendido por dia</CardTitle>
        <CardDescription className="hidden tablet:block">Toque em um dia para ver só ele</CardDescription>
        <CardAction>
          <Legend />
        </CardAction>
      </CardHeader>
      {days.length === 0 ? (
        <p className="border-t border-border px-3.5 py-6 text-[11px] text-muted-foreground tablet:px-5">
          Nenhum dia de venda ainda.{" "}
          <Link transitionTypes={["screen"]} href="/" className="text-foreground underline underline-offset-4">
            Criar o primeiro dia em Vendas
          </Link>
        </p>
      ) : (
        days.map((d) => (
          <DayRow
            key={d.day.id}
            summary={d}
            scale={maxSold}
            selected={period === d.day.id}
            dimmed={period !== "all" && period !== d.day.id}
            onClick={() => onSelect(period === d.day.id ? "all" : d.day.id)}
          />
        ))
      )}
    </Card>
  );
}
