"use client";

import { Plus } from "lucide-react";
import { startTransition, useState } from "react";
import { Button } from "@/componentes/ui/button";
import { lerBancoLocal } from "@/local-db/ler-banco-local";
import { useLeituraLocal } from "@/local-db/use-leitura-local";
import { montarCardapio } from "@/lib/cardapio";
import { diaInicial, diasAtivos } from "@/lib/dias";
import { PrimeiroDia } from "../dia/primeiro-dia";
import { TrocaSuave } from "../transicoes/troca-suave";
import { SeletorDeDia } from "../dia/seletor-de-dia";
import { IconeCardapio } from "../icones/icone-cardapio";
import { Migalha } from "../migalha";
import { ItensSemDia } from "./itens-sem-dia";
import { ListaDeItens } from "./lista-de-itens";
import { NovoItem } from "./novo-item";
import { PrimeiroItem } from "./primeiro-item";


export function Cardapio() {
  const dados = useLeituraLocal(lerBancoLocal);
  const [diaId, setDiaId] = useState<string | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const escolherDia = (id: string) => startTransition(() => setDiaId(id));

  const adicionar = (
    <Button onClick={() => setNovoAberto(true)}>
      <Plus className="size-3.5" strokeWidth={2.4} />
      Adicionar item
    </Button>
  );

  if (!dados) {
    return (
      <>
        <Migalha Icone={IconeCardapio} titulo="Cardápio" />
        <p className="text-[11px] text-muted-foreground" role="status">
          Carregando…
        </p>
      </>
    );
  }

  const dias = diasAtivos(dados.dias);
  const dia = dias.find((d) => d.id === diaId) ?? diaInicial(dias, dados.hoje);
  const produtosAtivos = dados.produtos
    .filter((p) => p.ativo)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <>
      <Migalha Icone={IconeCardapio} titulo="Cardápio">
        {adicionar}
      </Migalha>

      <section className="flex flex-col gap-3 desk:flex-row desk:flex-wrap desk:items-end desk:justify-between desk:gap-4">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex max-w-[560px] flex-col gap-1">
            <h1 className="text-lg leading-[1.2] font-semibold tracking-[-0.02em] tablet:text-[26px]">Cardápio</h1>
            <span className="text-[11px] text-muted-foreground tablet:text-xs">
              O que a cantina vende e o preço de cada item em cada dia de venda.
            </span>
          </div>
          <Button
            onClick={() => setNovoAberto(true)}
            aria-label="Adicionar item"
            className="h-9 flex-none rounded-[9px] tablet:hidden"
          >
            <Plus className="size-3.5" strokeWidth={2.4} />
            Item
          </Button>
        </div>
        {dia && <SeletorDeDia dias={dias} hoje={dados.hoje} diaId={dia.id} aoEscolher={escolherDia} />}
      </section>

      {novoAberto && <NovoItem diaId={dia?.id ?? null} aoFechar={() => setNovoAberto(false)} />}

      {dia ? (
        <TrocaSuave>
          <ListaDeItens key={dia.id} dia={dia} cardapio={montarCardapio(dados, dia.id)} />
        </TrocaSuave>
      ) : produtosAtivos.length > 0 ? (
        <>
          <PrimeiroDia
            hoje={dados.hoje}
            aoEscolherDia={escolherDia}
            descricao="Agora crie o primeiro dia de venda. Os itens cadastrados entram à venda nele com o preço padrão."
          />
          <ItensSemDia produtos={produtosAtivos} />
        </>
      ) : (
        !novoAberto && <PrimeiroItem aoAdicionar={() => setNovoAberto(true)} />
      )}
    </>
  );
}
