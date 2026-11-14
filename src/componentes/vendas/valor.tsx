import { formatarBRL } from "@/lib/formato";
import type { PedidoDoDia } from "@/lib/vendas";

export function Valor({ pedido }: { pedido: PedidoDoDia }) {
  const detalhe =
    pedido.status === "pendente" && pedido.aberto < pedido.valor
      ? `falta ${formatarBRL(pedido.aberto)}`
      : pedido.precoUnitario !== null && `${formatarBRL(pedido.precoUnitario)} cada`;
  return (
    <span className="flex flex-col items-end leading-[1.3]">
      <span>{formatarBRL(pedido.valor)}</span>
      {detalhe && <span className="text-[11px] text-muted-foreground">{detalhe}</span>}
    </span>
  );
}
