"use client";

import Link from "next/link";
import { startTransition, useMemo, useState } from "react";
import { lerBancoLocal } from "@/local-db/read-local-db";
import { useLeituraLocal } from "@/local-db/use-local-query";
import { diaInicial, diasAtivos, marcaDoDia } from "@/lib/days";
import { diaPorExtenso } from "@/lib/format";
import { montarVendas, type FiltroStatus } from "@/lib/sales";
import { PrimeiroDia } from "../day/first-day";
import { TrocaSuave } from "../transitions/smooth-swap";
import { RemoverDia } from "../day/remove-day";
import { SeletorDeDia } from "../day/day-picker";
import { IconeVendas } from "../icons/sales-icon";
import { Migalha } from "../breadcrumb";
import { ComecePeloCardapio } from "./start-with-menu";
import { FormularioDePedido } from "./order-form";
import { NovaVendaMovel } from "./mobile-new-sale";
import { NumerosDeVendas } from "./sales-stats";
import { PedidosDoDia } from "./day-orders";


export function Vendas() {
  const dados = useLeituraLocal(lerBancoLocal);
  const [diaId, setDiaId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");

  const dias = useMemo(() => (dados ? diasAtivos(dados.dias) : []), [dados]);
  const dia = dados ? (dias.find((d) => d.id === diaId) ?? diaInicial(dias, dados.hoje)) : null;
  const tela = useMemo(
    () => dados && dia && montarVendas(dados, dia.id, { busca, filtro }),
    [dados, dia, busca, filtro],
  );

  function escolherDia(id: string) {
    startTransition(() => {
      setDiaId(id);
      setBusca("");
      setFiltro("todos");
    });
  }

  const migalha = <Migalha Icone={IconeVendas} titulo="Vendas" />;

  if (!dados) {
    return (
      <>
        {migalha}
        <p className="text-[11px] text-muted-foreground" role="status">
          Carregando…
        </p>
      </>
    );
  }

  if (!dia || !tela) {
    return (
      <>
        {migalha}
        <h1 className="text-xl leading-[1.2] font-semibold tracking-[-0.02em] tablet:text-[26px]">Vendas</h1>
        {dados.produtos.some((p) => p.ativo) ? (
          <PrimeiroDia hoje={dados.hoje} aoEscolherDia={escolherDia} />
        ) : (
          <ComecePeloCardapio />
        )}
      </>
    );
  }

  const marca = marcaDoDia(dia, dias, dados.hoje);

  return (
    <>
      {migalha}

      <section className="flex flex-col gap-3 desk:flex-row desk:flex-wrap desk:items-end desk:justify-between desk:gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl leading-[1.2] font-semibold tracking-[-0.02em] tablet:text-[26px]">Vendas</h1>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>
              {diaPorExtenso(dia.data)}
              {marca === "hoje" ? " · hoje" : marca === "próximo" ? " · próximo dia de venda" : ""}
            </span>
            ·
            <Link transitionTypes={["tela"]} href="/cardapio" className="text-foreground underline underline-offset-[3px]">
              preços no Cardápio
            </Link>
            <RemoverDia dia={dia} />
          </p>
        </div>
        <SeletorDeDia dias={dias} hoje={dados.hoje} diaId={dia.id} aoEscolher={escolherDia} />
      </section>

      <div className="hidden tablet:block">
        <FormularioDePedido key={dia.id} diaId={dia.id} cardapio={tela.cardapio} layout="linha" />
      </div>

      <TrocaSuave>
        <NumerosDeVendas numeros={tela.numeros} />

        <PedidosDoDia
          key={dia.id}
          tela={tela}
          busca={busca}
          aoBuscar={setBusca}
          filtro={filtro}
          aoFiltrar={setFiltro}
        />
      </TrocaSuave>

      <NovaVendaMovel diaId={dia.id} cardapio={tela.cardapio} />
    </>
  );
}
