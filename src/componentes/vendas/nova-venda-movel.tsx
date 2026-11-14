"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/componentes/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/componentes/ui/sheet";
import type { ItemDoCardapio } from "@/lib/vendas";
import { FormularioDePedido } from "./formulario-de-pedido";

/** Celular: botão flutuante "Nova venda" que abre o formulário numa folha de baixo para cima. */
export function NovaVendaMovel({ diaId, cardapio }: { diaId: string; cardapio: ItemDoCardapio[] }) {
  const [aberta, setAberta] = useState(false);

  return (
    <Sheet open={aberta} onOpenChange={setAberta}>
      <SheetTrigger asChild>
        <Button className="fixed right-4 bottom-[calc(92px+env(safe-area-inset-bottom))] z-20 h-12 rounded-[14px] px-[18px] text-[13px] shadow-[0_8px_24px_rgba(17,17,19,0.25)] tablet:hidden">
          <Plus className="size-4" />
          Nova venda
        </Button>
      </SheetTrigger>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Novo pedido</SheetTitle>
        </SheetHeader>
        <FormularioDePedido diaId={diaId} cardapio={cardapio} layout="folha" aoRegistrar={() => setAberta(false)} />
      </SheetContent>
    </Sheet>
  );
}
