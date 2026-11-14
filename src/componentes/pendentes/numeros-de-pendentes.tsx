import { Card } from "@/componentes/ui/card";
import { formatarBRL, plural } from "@/lib/formato";
import type { Pendentes } from "@/lib/pendentes";
import { FaixaDeNumeros } from "../faixa-de-numeros";
import { Numero } from "../numero";

/** Faixa de 4 números no tablet e desktop; um card resumido no celular. */
export function NumerosDePendentes({ numeros }: { numeros: Pendentes["numeros"] }) {
  return (
    <>
      <div role="region" aria-label="Números" className="hidden tablet:order-2 tablet:block">
        <FaixaDeNumeros>
          <Numero rotulo="Em aberto" valor={formatarBRL(numeros.emAberto)} tom="warn">
            {plural(numeros.pedidosEmAberto, "pedido", "pedidos")} sem pagar
          </Numero>
          <Numero rotulo="Pessoas devendo" valor={String(numeros.pessoas)}>
            neste período
          </Numero>
          <Numero rotulo="Há mais de 2 semanas" valor={String(numeros.pessoasAntigas)}>
            {numeros.pessoasAntigas ? `${formatarBRL(numeros.valorAntigo)} em aberto` : "ninguém atrasado"}
          </Numero>
          <Numero rotulo="Recebido agora" valor={formatarBRL(numeros.recebidoAgora)}>
            hoje, de quem estava pendente
          </Numero>
        </FaixaDeNumeros>
      </div>

      <Card
        role="region"
        aria-label="Resumo"
        className="order-2 flex-row items-end justify-between gap-3 p-4 tablet:hidden"
      >
        <div className="flex flex-col">
          <span className="text-[11px] text-muted-foreground">Em aberto</span>
          <strong className="text-[26px] leading-[1.15] font-semibold tracking-[-0.02em] text-warn">
            {formatarBRL(numeros.emAberto)}
          </strong>
          <span className="text-[11px] text-muted-foreground">
            {plural(numeros.pessoas, "pessoa", "pessoas")} · {numeros.pessoasAntigas} há mais de 2 semanas
          </span>
        </div>
        <div className="flex flex-none flex-col items-end">
          <span className="text-[11px] whitespace-nowrap text-muted-foreground">Recebido agora</span>
          <strong className="text-[15px] font-semibold text-foreground">{formatarBRL(numeros.recebidoAgora)}</strong>
        </div>
      </Card>
    </>
  );
}
