"use client";

import { useState } from "react";
import { Button } from "@/componentes/ui/button";
import { Card } from "@/componentes/ui/card";
import { NovoDia } from "./novo-dia";

/** Vendas e Cardápio sem nenhum dia de venda: no lugar do conteúdo da tela. */
export function PrimeiroDia({
  hoje,
  aoEscolherDia,
  descricao = "Crie o primeiro dia para montar o cardápio e registrar vendas.",
}: {
  hoje: string;
  aoEscolherDia: (diaId: string) => void;
  descricao?: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <Card className="items-center gap-1 px-6 py-10 text-center">
      <h2 className="text-sm font-semibold">Nenhum dia de venda ainda</h2>
      <p className="max-w-[420px] text-xs text-muted-foreground">{descricao}</p>
      <NovoDia dias={[]} hoje={hoje} aberto={aberto} aoMudarAberto={setAberto} aoEscolherDia={aoEscolherDia}>
        <Button className="mt-3" aria-expanded={aberto} aria-haspopup="dialog" onClick={() => setAberto(true)}>
          Criar dia de venda
        </Button>
      </NovoDia>
    </Card>
  );
}
