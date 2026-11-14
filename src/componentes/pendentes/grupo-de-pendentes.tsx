import { Card } from "@/componentes/ui/card";
import { formatarBRL, plural } from "@/lib/formato";
import type { GrupoPendentes } from "@/lib/pendentes";
import { LinhaPendente } from "./linha-pendente";

export function GrupoDePendentes({
  grupo,
  escolhendo,
  aoEscolher,
  aoReceber,
}: {
  grupo: GrupoPendentes;
  /** Pedido com a escolha Pix · Dinheiro aberta. */
  escolhendo: string | null;
  aoEscolher: (pedidoId: string | null) => void;
  aoReceber: (pedidoId: string, pagamentoId: string) => void;
}) {
  return (
    <Card role="region" aria-label={grupo.titulo}>
      <div className="flex items-center justify-between gap-3 bg-muted px-3.5 py-2.5 tablet:px-5 tablet:py-3.5">
        <div className="flex items-center gap-2 tablet:gap-2.5">
          <i className={`size-2 rounded-full ${grupo.chave === "antigos" ? "bg-warn" : "bg-muted-foreground"}`} />
          <h2 className="text-xs font-semibold tablet:text-sm">{grupo.titulo}</h2>
          <span className="hidden text-[11px] text-muted-foreground tablet:inline">
            {plural(grupo.pessoas, "pessoa", "pessoas")}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground tablet:text-[13px] tablet:font-semibold tablet:text-foreground">
          {formatarBRL(grupo.total)}
          <span className="tablet:hidden"> em aberto</span>
        </span>
      </div>
      {grupo.linhas.map((linha) => (
        <LinhaPendente
          key={linha.pedidoId}
          linha={linha}
          escolhendo={escolhendo === linha.pedidoId}
          aoAbrir={() => aoEscolher(linha.pedidoId)}
          aoFechar={() => aoEscolher(null)}
          aoReceber={(pagamentoId) => aoReceber(linha.pedidoId, pagamentoId)}
        />
      ))}
    </Card>
  );
}
