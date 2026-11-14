import { formatarBRL } from "@/lib/formato";
import type { ColunaDoQuadro, StatusPedido } from "@/lib/vendas";
import { Card } from "@/componentes/ui/card";
import { AcoesDoPedido } from "./acoes-do-pedido";

const COLUNA: Record<StatusPedido, { titulo: string; cor: string }> = {
  reservado: { titulo: "Reservas", cor: "bg-text-2" },
  pendente: { titulo: "Pendentes", cor: "bg-warn" },
  pago: { titulo: "Pagos", cor: "bg-ok" },
};

/** Quadro: Reservas → Pendentes → Pagos. O total dos pendentes é o que falta receber. */
export function QuadroDePedidos({ colunas }: { colunas: ColunaDoQuadro[] }) {
  return (
    <div className="grid items-start gap-3.5 wide:grid-cols-3">
      {colunas.map(({ status, pedidos, total }) => (
        <section
          key={status}
          aria-label={COLUNA[status].titulo}
          className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-muted p-3"
        >
          <div className="flex items-center justify-between px-1 py-0.5">
            <span className="inline-flex items-center gap-2 font-semibold">
              <i className={`size-2 rounded-full ${COLUNA[status].cor}`} />
              {COLUNA[status].titulo}
              <span className="text-[11px] font-normal text-muted-foreground">{pedidos.length}</span>
            </span>
            <span className="text-[11px] text-muted-foreground">{formatarBRL(total)}</span>
          </div>
          {pedidos.map((p) => (
            <Card key={p.id} className="gap-2 px-3.5 py-3">
              <div className="flex justify-between gap-2">
                <strong className="truncate font-semibold">{p.nome}</strong>
                <strong className="font-semibold">{formatarBRL(p.valor)}</strong>
              </div>
              <span className="text-[11px] text-text-2">{p.descricao}</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {p.hora}
                  {status === "pendente" && p.aberto < p.valor && ` · falta ${formatarBRL(p.aberto)}`}
                </span>
                <AcoesDoPedido pedido={p} onde="quadro" />
              </div>
            </Card>
          ))}
          {pedidos.length === 0 && (
            <p className="rounded-[10px] border border-dashed border-input p-[18px] text-center text-xs text-muted-foreground">
              Nenhum pedido aqui
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
