"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/componentes/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/componentes/ui/tabs";
import { plural } from "@/lib/formato";
import type { FiltroStatus, TelaVendas } from "@/lib/vendas";
import { ListaDePedidos } from "./lista-de-pedidos";
import { QuadroDePedidos } from "./quadro-de-pedidos";

const FILTROS: [FiltroStatus, string][] = [
  ["todos", "Todos"],
  ["reservado", "Reservas"],
  ["pendente", "Pendentes"],
  ["pago", "Pagos"],
];

export function PedidosDoDia({
  tela,
  busca,
  aoBuscar,
  filtro,
  aoFiltrar,
}: {
  tela: TelaVendas;
  busca: string;
  aoBuscar: (busca: string) => void;
  filtro: FiltroStatus;
  aoFiltrar: (filtro: FiltroStatus) => void;
}) {
  const [visao, setVisao] = useState<"lista" | "quadro">("lista");
  const lista = visao === "lista";
  const contagem = lista ? tela.pedidos.length : tela.quadro.reduce((soma, c) => soma + c.pedidos.length, 0);

  const vazio = busca.trim()
    ? "Ninguém com esse nome neste dia."
    : tela.totalDoDia === 0
      ? "Nada por aqui ainda. Registre a primeira venda ou reserva."
      : "Nenhum pedido com esse status.";

  return (
    <section aria-labelledby="pedidos-do-dia" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 id="pedidos-do-dia" className="text-sm font-semibold">
            Pedidos do dia
          </h2>
          <span className="text-[11px] text-muted-foreground">{plural(contagem, "pedido", "pedidos")}</span>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 tablet:w-auto">
          <div className="relative w-full tablet:w-[220px]">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="Buscar cliente"
              placeholder="Buscar cliente"
              value={busca}
              onChange={(e) => aoBuscar(e.target.value)}
              className="bg-background pl-8 tablet:h-9"
            />
          </div>
          {lista && (
            <Tabs value={filtro} onValueChange={(v) => aoFiltrar(v as FiltroStatus)}>
              <TabsList aria-label="Status">
                {FILTROS.map(([valor, rotulo]) => (
                  <TabsTrigger key={valor} value={valor}>
                    {rotulo}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <Tabs value={visao} onValueChange={(v) => setVisao(v as typeof visao)} className="hidden tablet:block">
            <TabsList aria-label="Visualização">
              <TabsTrigger value="lista">Lista</TabsTrigger>
              <TabsTrigger value="quadro">Quadro</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {lista ? (
        <ListaDePedidos key={`${filtro}|${busca}`} pedidos={tela.pedidos} vazio={vazio} />
      ) : (
        <QuadroDePedidos colunas={tela.quadro} />
      )}
    </section>
  );
}
