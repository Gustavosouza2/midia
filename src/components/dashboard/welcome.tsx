import type { DiaDeVenda } from "@/local-db";
import { Card } from "@/components/ui/card";
import { diaPorExtenso, plural } from "@/lib/format";
import { SeloDoDia } from "./day-badge";

export function BoasVindas({ proximo, reservas }: { proximo: DiaDeVenda | null; reservas: number }) {
  return (
    <Card
      role="region"
      aria-label="Boas-vindas"
      className="gap-3 p-4 tablet:flex-row tablet:flex-wrap tablet:items-center tablet:justify-between tablet:gap-5 tablet:px-6 tablet:py-[22px]"
    >
      <div className="flex min-w-0 flex-col gap-1 tablet:gap-1.5">
        <span className="text-[11px] font-semibold tracking-[0.06em] text-foreground uppercase">Bem-vindo de volta</span>
        <h1 className="text-xl leading-[1.2] font-semibold tracking-[-0.02em] tablet:text-[26px]">Painel da Cantina</h1>
        <span className="hidden text-xs text-muted-foreground tablet:block">
          Resumo das vendas, do que falta receber e das reservas.
        </span>
      </div>

      <div className="flex items-center gap-3 rounded-[10px] border border-border bg-muted px-3 py-2.5 tablet:gap-3.5 tablet:px-4 tablet:py-3">
        <SeloDoDia data={proximo?.data} />
        <div className="flex flex-col leading-[1.35]">
          <span className="text-[11px] text-muted-foreground">Próximo dia de venda</span>
          <strong className="text-xs font-semibold tablet:text-[13px]">
            {proximo ? diaPorExtenso(proximo.data) : "Nenhum dia marcado"}
          </strong>
          {proximo && (
            <span className="text-[11px] text-foreground">
              {reservas ? plural(reservas, "reserva feita", "reservas feitas") : "Nenhuma reserva ainda"}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
