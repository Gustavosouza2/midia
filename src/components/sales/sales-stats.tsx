import { formatarBRL, plural } from "@/lib/format";
import type { TelaVendas } from "@/lib/sales";
import { FaixaDeNumeros } from "../stat-strip";
import { Numero } from "../stat";

export function NumerosDeVendas({ numeros }: { numeros: TelaVendas["numeros"] }) {
  return (
    <FaixaDeNumeros>
      <Numero rotulo="Itens vendidos" valor={String(numeros.itens)}>
        {formatarBRL(numeros.vendido)} no total
      </Numero>
      <Numero rotulo="Recebido" valor={formatarBRL(numeros.recebido)}>
        {numeros.vendido ? `${Math.round((numeros.recebido / numeros.vendido) * 100)}% do vendido` : "nada vendido ainda"}
      </Numero>
      <Numero rotulo="Pendente" valor={formatarBRL(numeros.pendente)} tom="warn">
        {numeros.pedidosPendentes
          ? `${plural(numeros.pedidosPendentes, "pedido", "pedidos")} em aberto`
          : "nada em aberto"}
      </Numero>
      <Numero rotulo="Reservas" valor={String(numeros.reservas)}>
        {numeros.reservas
          ? `${plural(numeros.itensReservados, "item", "itens")} · ${formatarBRL(numeros.valorReservas)}`
          : "nenhuma para este dia"}
      </Numero>
    </FaixaDeNumeros>
  );
}
