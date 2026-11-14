"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatarBRL } from "@/lib/format";
import { POR_PAGINA, type PedidoDoDia } from "@/lib/sales";
import { AcoesDoPedido } from "./order-actions";

export function Cartoes({ pedidos }: { pedidos: PedidoDoDia[] }) {
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const restantes = pedidos.length - mostrar;

  return (
    <ul aria-label="Pedidos" className="flex flex-col gap-2 tablet:hidden">
      {pedidos.slice(0, mostrar).map((p) => (
        <li key={p.id} className="animate-in duration-300 fade-in slide-in-from-top-1">
          <Card className="gap-2 px-3.5 py-3">
            <div className="flex justify-between gap-2.5">
              <div className="flex min-w-0 flex-col leading-[1.3]">
                <strong className="truncate font-semibold">{p.nome}</strong>
                <span className="text-[11px] text-text-2">{p.descricao}</span>
              </div>
              <div className="flex flex-col items-end leading-[1.3]">
                <strong className="font-semibold">{formatarBRL(p.valor)}</strong>
                <span className="text-[11px] text-muted-foreground">{p.hora}</span>
              </div>
            </div>
            <AcoesDoPedido pedido={p} onde="cartao" />
          </Card>
        </li>
      ))}
      {restantes > 0 && (
        <li>
          <Button
            variant="outline"
            onClick={() => setMostrar((n) => n + POR_PAGINA)}
            className="h-10 w-full rounded-[10px] text-text-2"
          >
            Carregar mais ({restantes})
          </Button>
        </li>
      )}
    </ul>
  );
}
