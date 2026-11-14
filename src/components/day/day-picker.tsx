"use client";

import { useState } from "react";
import type { DiaDeVenda } from "@/local-db";
import { FiltroDeDia } from "./day-filter";
import { NovoDia } from "./new-day";

/**
 * Filtro de dia de Vendas e Cardápio, com o "+ Novo dia de venda" no rodapé da lista.
 * `dias` vem de diasAtivos(); a tela guarda o dia selecionado e começa por diaInicial().
 */
export function SeletorDeDia({
  dias,
  hoje,
  diaId,
  aoEscolher,
}: {
  dias: DiaDeVenda[];
  hoje: string;
  diaId: string;
  aoEscolher: (diaId: string) => void;
}) {
  const [novoAberto, setNovoAberto] = useState(false);

  return (
    <NovoDia dias={dias} hoje={hoje} aberto={novoAberto} aoMudarAberto={setNovoAberto} aoEscolherDia={aoEscolher}>
      <div className="flex min-w-0">
        <FiltroDeDia
          dias={dias}
          hoje={hoje}
          valor={diaId}
          aoEscolher={aoEscolher}
          rotulo="Dia de venda"
          aoNovoDia={() => setNovoAberto(true)}
        />
      </div>
    </NovoDia>
  );
}
