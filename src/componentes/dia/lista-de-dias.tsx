"use client";

import { Check, Plus } from "lucide-react";
import type { DiaDeVenda } from "@/local-db";
import { agruparPorMes, marcaDoDia } from "@/lib/dias";
import { RotuloDoDia } from "./rotulo-do-dia";

const ITEM =
  "flex h-12 w-full flex-none items-center gap-2 rounded-lg px-2.5 text-left text-[13px] text-text-2 outline-none hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring aria-pressed:bg-accent tablet:h-10 tablet:text-xs";

/** Conteúdo do popover/folha do FiltroDeDia: "Todos os dias", os dias agrupados por mês e o "+ Novo dia de venda". */
export function ListaDeDias({
  dias,
  hoje,
  valor,
  aoEscolher,
  todos,
  aoNovoDia,
}: {
  dias: DiaDeVenda[];
  hoje: string;
  valor: string;
  aoEscolher: (valor: string) => void;
  todos: boolean;
  aoNovoDia?: () => void;
}) {
  // Ao abrir, a lista já mostra o dia escolhido, mesmo que ele esteja no fim.
  function rolarAteOEscolhido(rolagem: HTMLDivElement | null) {
    const item = rolagem?.querySelector<HTMLElement>("[aria-pressed=true]");
    if (rolagem && item) rolagem.scrollTop = item.offsetTop - (rolagem.clientHeight - item.offsetHeight) / 2;
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div ref={rolarAteOEscolhido} className="relative -mx-1 flex min-h-0 flex-col overflow-y-auto px-1">
        {todos && (
          <button type="button" aria-pressed={valor === "todos"} onClick={() => aoEscolher("todos")} className={ITEM}>
            <span className="flex-1 font-medium text-foreground">Todos os dias</span>
            {valor === "todos" && <Check aria-hidden="true" className="size-4 flex-none text-foreground" />}
          </button>
        )}
        {agruparPorMes(dias).map(([mes, doMes]) => (
          <div key={mes} role="group" aria-label={mes} className="flex flex-col">
            <span className="px-2.5 pt-3 pb-1 text-[11px] text-muted-foreground">{mes}</span>
            {doMes.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={d.id === valor}
                onClick={() => aoEscolher(d.id)}
                className={ITEM}
              >
                <span className="min-w-0 flex-1">
                  <RotuloDoDia dia={d} marca={marcaDoDia(d, dias, hoje)} />
                </span>
                {d.id === valor && <Check aria-hidden="true" className="size-4 flex-none text-foreground" />}
              </button>
            ))}
          </div>
        ))}
      </div>
      {aoNovoDia && (
        <div className="-mx-1 mt-1 border-t border-border px-1 pt-1">
          <button type="button" onClick={aoNovoDia} className={`${ITEM} font-medium text-foreground`}>
            <Plus aria-hidden="true" className="size-4 flex-none" />
            Novo dia de venda
          </button>
        </div>
      )}
    </div>
  );
}
