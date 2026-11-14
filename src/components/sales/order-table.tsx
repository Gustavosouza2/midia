"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { paginar, type PedidoDoDia } from "@/lib/sales";
import { AcoesDoPedido } from "./order-actions";
import { Valor } from "./order-amount";

export function Tabela({ pedidos }: { pedidos: PedidoDoDia[] }) {
  const [pagina, setPagina] = useState(1);
  const atual = paginar(pedidos, pagina);
  const celula = "border-b border-border px-5 py-3 group-last:border-b-0";
  const cabecalho = "border-b border-border bg-muted px-5 py-2.5 text-[11px] font-medium text-muted-foreground";

  return (
    <Card className="hidden tablet:flex">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${cabecalho} text-left`}>Nome</th>
              <th className={`${cabecalho} text-left`}>Item</th>
              <th className={`${cabecalho} text-right`}>Valor</th>
              <th className={`${cabecalho} text-left`}>Hora</th>
              <th className={`${cabecalho} w-[220px] text-right`}>Status</th>
            </tr>
          </thead>
          <tbody>
            {atual.itens.map((p) => (
              <tr key={p.id} className="group animate-in duration-300 fade-in">
                <td className={`${celula} font-semibold`}>{p.nome}</td>
                <td className={`${celula} text-text-2`}>{p.descricao}</td>
                <td className={`${celula} text-right whitespace-nowrap`}>
                  <Valor pedido={p} />
                </td>
                <td className={`${celula} whitespace-nowrap text-muted-foreground`}>{p.hora}</td>
                <td className={`${celula} py-2 text-right whitespace-nowrap`}>
                  <AcoesDoPedido pedido={p} onde="tabela" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {atual.totalPaginas > 1 && (
        <nav
          aria-label="Páginas"
          className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border bg-muted px-5 py-2.5"
        >
          <span className="text-[11px] text-muted-foreground">{atual.faixa}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={atual.pagina === 1} onClick={() => setPagina(atual.pagina - 1)}>
              ‹ Anterior
            </Button>
            {Array.from({ length: atual.totalPaginas }, (_, i) => i + 1).map((n) => (
              <Button
                key={n}
                variant={n === atual.pagina ? "default" : "outline"}
                size="icon-sm"
                aria-label={`Página ${n}`}
                aria-current={n === atual.pagina ? "page" : undefined}
                onClick={() => setPagina(n)}
              >
                {n}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={atual.pagina === atual.totalPaginas}
              onClick={() => setPagina(atual.pagina + 1)}
            >
              Próxima ›
            </Button>
          </div>
        </nav>
      )}
    </Card>
  );
}
