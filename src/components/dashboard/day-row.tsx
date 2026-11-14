import { longDate, formatBRL, plural, shortDate } from "@/lib/format";
import type { DaySummary } from "@/lib/dashboard";
import { striped } from "./striped";

export function DayRow({
  summary,
  scale,
  selected,
  dimmed,
  onClick,
}: {
  summary: DaySummary;
  /** Amount that fills the whole bar (the largest sold amount in the list). */
  scale: number;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  const { day, sold, received } = summary;
  // A day that has not sold anything yet, only has reservations.
  const onlyReservations = summary.upcoming && summary.sales === 0;
  const meta = onlyReservations
    ? `próximo · ${plural(summary.reservations, "reserva", "reservas")}`
    : `${plural(summary.items, "item", "itens")} · ${plural(summary.sales, "venda", "vendas")}`;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${longDate(day.date)}: ${formatBRL(sold)} vendidos, ${formatBRL(received)} recebidos. Filtrar por este dia`}
      onClick={onClick}
      className={`flex w-full flex-col gap-1.5 border-t border-border px-3.5 py-3 text-left transition-[opacity,background-color] duration-300 ease-out hover:bg-muted tablet:grid tablet:grid-cols-[140px_minmax(0,1fr)_92px] tablet:items-center tablet:gap-3.5 tablet:px-5 ${dimmed ? "opacity-40" : ""}`}
    >
      <span className="flex justify-between gap-2 leading-[1.3] tablet:flex-col tablet:justify-start tablet:gap-0">
        <strong className="font-semibold">{shortDate(day.date)}</strong>
        <span className="font-semibold tablet:hidden">{formatBRL(sold)}</span>
        <span className="hidden text-[11px] text-muted-foreground tablet:block">{meta}</span>
      </span>
      <span aria-hidden="true" className="flex h-2.5 w-full gap-0.5 tablet:h-3.5">
        <span
          className="block rounded-[3px] bg-ok-fill transition-[width] duration-500 ease-out"
          style={{ width: `${(received / scale) * 100}%` }}
        />
        <span
          className="block rounded-[3px] transition-[width] duration-500 ease-out"
          style={{ ...striped, width: `${((sold - received) / scale) * 100}%` }}
        />
      </span>
      <span className="text-[11px] text-muted-foreground tablet:hidden">{meta}</span>
      <span className="hidden flex-col text-right leading-[1.3] tablet:flex">
        <strong className="font-semibold">{formatBRL(sold)}</strong>
        <span className="text-[11px] text-muted-foreground">
          {onlyReservations ? "só reservas" : `${summary.receivedPct}% recebido`}
        </span>
      </span>
    </button>
  );
}
