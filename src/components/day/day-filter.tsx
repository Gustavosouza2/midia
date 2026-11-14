"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { startTransition, useOptimistic, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { DiaDeVenda } from "@/local-db";
import { marcaDoDia, vizinhos } from "@/lib/days";
import { ListaDeDias } from "./day-list";
import { RotuloDoDia } from "./day-label";
import { useTablet } from "./use-tablet";

const TITULO = "Escolher dia";
const SETA = "size-11 flex-none rounded-[10px] tablet:size-[34px] tablet:rounded-lg";

/**
 * Filtro de dia de venda das quatro telas (DESIGN.md, "Dias de venda"): ‹ [dia ▾] ›. O gatilho
 * abre a lista completa num popover (tablet e desktop) ou numa folha (celular).
 * `dias` vem de diasAtivos(); `valor` é o id do dia ou "todos".
 */
export function FiltroDeDia({
  dias,
  hoje,
  valor,
  aoEscolher,
  rotulo,
  todos = false,
  aoNovoDia,
}: {
  dias: DiaDeVenda[];
  hoje: string;
  valor: string;
  aoEscolher: (valor: string) => void;
  /** Nome do grupo para leitores de tela ("Período", "Dia de venda"). */
  rotulo: string;
  /** Painel e Pendentes: "Todos os dias" no topo da lista. */
  todos?: boolean;
  /** Vendas e Cardápio: "+ Novo dia de venda" no rodapé da lista. */
  aoNovoDia?: () => void;
}) {
  const tablet = useTablet();
  const [aberto, setAberto] = useState(false);
  // Ao trocar a lista pelo "Novo dia", o foco não volta ao gatilho: isso fecharia o formulário que acabou de abrir.
  const indoParaNovoDia = useRef(false);
  // A tela troca de dia numa transição; o filtro já mostra o dia novo, e toques seguidos na seta andam um dia cada.
  const [mostrado, mostrar] = useOptimistic(valor);
  const dia = dias.find((d) => d.id === mostrado);
  const { anterior, seguinte } = vizinhos(dias, mostrado);

  const escolher = (novo: string) => {
    setAberto(false);
    startTransition(() => {
      mostrar(novo);
      aoEscolher(novo);
    });
  };
  const devolverFoco = (evento: Event) => {
    if (indoParaNovoDia.current) evento.preventDefault();
    indoParaNovoDia.current = false;
  };
  const lista = (
    <ListaDeDias
      dias={dias}
      hoje={hoje}
      valor={mostrado}
      aoEscolher={escolher}
      todos={todos}
      aoNovoDia={
        aoNovoDia &&
        (() => {
          indoParaNovoDia.current = true;
          setAberto(false);
          aoNovoDia();
        })
      }
    />
  );

  return (
    <div role="group" aria-label={rotulo} className="flex w-full min-w-0 items-center gap-2 tablet:w-auto tablet:gap-1.5">
      {dia && (
        <Button
          variant="outline"
          size="icon"
          aria-label="Dia anterior"
          disabled={!anterior}
          onClick={() => anterior && escolher(anterior.id)}
          className={SETA}
        >
          <ChevronLeft className="size-4" />
        </Button>
      )}

      <Popover open={aberto && tablet} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            aria-expanded={aberto}
            className="h-11 min-w-0 flex-1 justify-start gap-2 text-left rounded-[10px] px-3 text-[13px] tablet:h-[34px] tablet:w-72 tablet:flex-none tablet:rounded-lg tablet:px-2.5 tablet:text-xs"
          >
            <CalendarDays aria-hidden="true" className="size-4 text-muted-foreground tablet:size-3.5" />
            <span className="min-w-0 flex-1">
              {dia ? (
                <RotuloDoDia dia={dia} marca={marcaDoDia(dia, dias, hoje)} />
              ) : (
                <span className="font-medium">Todos os dias</span>
              )}
            </span>
            <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground tablet:size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          aria-label={TITULO}
          onCloseAutoFocus={devolverFoco}
          className="flex max-h-[min(380px,var(--radix-popover-content-available-height))] w-80 flex-col p-1.5"
        >
          {lista}
        </PopoverContent>
      </Popover>

      {dia && (
        <Button
          variant="outline"
          size="icon"
          aria-label="Dia seguinte"
          disabled={!seguinte}
          onClick={() => seguinte && escolher(seguinte.id)}
          className={SETA}
        >
          <ChevronRight className="size-4" />
        </Button>
      )}

      <Sheet open={aberto && !tablet} onOpenChange={setAberto}>
        <SheetContent aria-describedby={undefined} onCloseAutoFocus={devolverFoco} className="overflow-hidden">
          <SheetHeader>
            <SheetTitle>{TITULO}</SheetTitle>
          </SheetHeader>
          {lista}
        </SheetContent>
      </Sheet>
    </div>
  );
}
