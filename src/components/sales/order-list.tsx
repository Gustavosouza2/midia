"use client";

import { Card } from "@/components/ui/card";
import type { PedidoDoDia } from "@/lib/sales";
import { Cartoes } from "./order-cards";
import { Tabela } from "./order-table";

/** Tablet e desktop: tabela paginada de 6 em 6. Celular: cartões com "Carregar mais". */
export function ListaDePedidos({ pedidos, vazio }: { pedidos: PedidoDoDia[]; vazio: string }) {
  if (pedidos.length === 0) {
    return <Card className="px-5 py-7 text-center text-xs text-muted-foreground">{vazio}</Card>;
  }
  return (
    <>
      <Tabela pedidos={pedidos} />
      <Cartoes pedidos={pedidos} />
    </>
  );
}
