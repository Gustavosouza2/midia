import { formatarBRL, plural } from "@/lib/format";
import type { Painel } from "@/lib/dashboard";
import { FaixaDeNumeros } from "../stat-strip";
import { Numero } from "../stat";

export function NumerosDoPainel({ numeros }: { numeros: Painel["numeros"] }) {
  return (
    <FaixaDeNumeros>
      <Numero rotulo="Recebido" valor={formatarBRL(numeros.recebido)}>
        <div aria-hidden="true" className="mt-0.5 h-1.5 overflow-hidden rounded-xs bg-border">
          <div className="h-full bg-ok-fill transition-[width] duration-500 ease-out" style={{ width: `${numeros.pctRecebido}%` }} />
        </div>
        <span>
          {numeros.pctRecebido}% de {formatarBRL(numeros.vendido)} vendidos
        </span>
      </Numero>
      <Numero rotulo="Pendente" valor={formatarBRL(numeros.pendente)} tom="warn">
        {plural(numeros.pessoasPendentes, "pessoa", "pessoas")} para receber
      </Numero>
      <Numero rotulo="Itens vendidos" valor={String(numeros.itens)}>
        {plural(numeros.vendas, "venda registrada", "vendas registradas")}
      </Numero>
      <Numero rotulo="Reservas" valor={String(numeros.reservas)}>
        {numeros.reservas ? `${formatarBRL(numeros.valorReservas)} a entregar` : "nenhuma neste período"}
      </Numero>
    </FaixaDeNumeros>
  );
}
