"use client";

import { Search } from "lucide-react";
import { FiltroDeDia } from "@/components/day/day-filter";
import { Input } from "@/components/ui/input";
import type { DiaDeVenda } from "@/local-db";
import type { Periodo } from "@/lib/dashboard";

/** Filtro de dia (só filtra: sem "+ Novo dia de venda") e a busca por pessoa. */
export function FiltroDePendentes({
  dias,
  hoje,
  periodo,
  aoEscolher,
  busca,
  aoBuscar,
}: {
  dias: DiaDeVenda[];
  hoje: string;
  periodo: Periodo;
  aoEscolher: (periodo: Periodo) => void;
  busca: string;
  aoBuscar: (busca: string) => void;
}) {
  return (
    <div className="contents tablet:order-1 tablet:flex tablet:flex-wrap tablet:items-center tablet:justify-between tablet:gap-3">
      <div className="order-1 min-w-0">
        <FiltroDeDia dias={dias} hoje={hoje} valor={periodo} aoEscolher={aoEscolher} rotulo="Dia de venda" todos />
      </div>

      <div className="relative order-3 tablet:w-60 tablet:max-w-full">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground tablet:left-2.5 tablet:size-3.5"
        />
        <Input
          type="search"
          aria-label="Buscar pessoa"
          placeholder="Buscar pessoa"
          value={busca}
          onChange={(e) => aoBuscar(e.target.value)}
          className="bg-background pl-9 tablet:pl-8"
        />
      </div>
    </div>
  );
}
