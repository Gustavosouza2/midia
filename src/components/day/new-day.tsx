"use client";

import type { ReactElement } from "react";
import { Popover, PopoverAnchor, PopoverContent, PopoverTitle } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { DiaDeVenda } from "@/local-db";
import { FormularioNovoDia } from "./new-day-form";
import { useTablet } from "./use-tablet";

const TITULO = "Novo dia de venda";

/**
 * "Novo dia de venda" (DESIGN.md, "Criar dia"). No tablet e no desktop abre um popover ancorado
 * em `children`; no celular, uma folha de baixo para cima. Ao criar, ou em "Abrir esse dia"
 * quando a data já existe, fecha e chama `aoEscolherDia` com o id.
 */
export function NovoDia({
  dias,
  hoje,
  aberto,
  aoMudarAberto,
  aoEscolherDia,
  children,
}: {
  /** Dias ativos (diasAtivos()), para a data sugerida, a data repetida e o "Copiar de". */
  dias: DiaDeVenda[];
  hoje: string;
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  aoEscolherDia: (diaId: string) => void;
  children: ReactElement;
}) {
  const tablet = useTablet();
  const formulario = (
    <FormularioNovoDia
      dias={dias}
      hoje={hoje}
      aoCancelar={() => aoMudarAberto(false)}
      aoEscolherDia={(id) => {
        aoMudarAberto(false);
        aoEscolherDia(id);
      }}
    />
  );

  return (
    <>
      <Popover open={aberto && tablet} onOpenChange={aoMudarAberto}>
        <PopoverAnchor asChild>{children}</PopoverAnchor>
        <PopoverContent align="start" aria-label={TITULO} className="flex w-80 flex-col gap-3">
          <PopoverTitle>{TITULO}</PopoverTitle>
          {formulario}
        </PopoverContent>
      </Popover>
      <Sheet open={aberto && !tablet} onOpenChange={aoMudarAberto}>
        <SheetContent aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>{TITULO}</SheetTitle>
          </SheetHeader>
          {formulario}
        </SheetContent>
      </Sheet>
    </>
  );
}
