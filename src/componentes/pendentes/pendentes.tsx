"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { startTransition, useMemo, useState } from "react";
import { Button } from "@/componentes/ui/button";
import { lerBancoLocal } from "@/local-db/ler-banco-local";
import { useLeituraLocal } from "@/local-db/use-leitura-local";
import type { Periodo } from "@/lib/painel";
import { montarPendentes } from "@/lib/pendentes";
import { IconePendentes } from "../icones/icone-pendentes";
import { Migalha } from "../migalha";
import { TrocaSuave } from "../transicoes/troca-suave";
import { FiltroDePendentes } from "./filtro-de-pendentes";
import { GrupoDePendentes } from "./grupo-de-pendentes";
import { NumerosDePendentes } from "./numeros-de-pendentes";
import { SemPendentes } from "./sem-pendentes";

/**
 * No celular, a ordem é abas → números → busca → grupos (protótipo Mobile-Pendentes);
 * no tablet e no desktop, abas e busca dividem uma linha acima dos números. A linha do
 * filtro vira `contents` no celular e os `order-*` arrumam os pedaços.
 */
export function Pendentes() {
  const dados = useLeituraLocal(lerBancoLocal);
  const [periodoEscolhido, setPeriodoEscolhido] = useState<Periodo>("todos");
  const [busca, setBusca] = useState("");
  /** Pedido → pagamento recebido nesta sessão. Some ao recarregar a tela. */
  const [recebidos, setRecebidos] = useState<ReadonlyMap<string, string>>(new Map());
  const [escolhendo, setEscolhendo] = useState<string | null>(null);

  const pendentes = useMemo(
    () => dados && montarPendentes(dados, { periodo: periodoEscolhido, busca }, dados.hoje, recebidos),
    [dados, periodoEscolhido, busca, recebidos],
  );

  const migalha = (
    <Migalha Icone={IconePendentes} titulo="Pendentes">
      <Button asChild>
        <Link transitionTypes={["tela"]} href="/vendas">
          <Plus className="size-3.5" />
          Nova venda
        </Link>
      </Button>
    </Migalha>
  );

  if (!dados || !pendentes) {
    return (
      <>
        {migalha}
        <p className="text-[11px] text-muted-foreground" role="status">
          Carregando…
        </p>
      </>
    );
  }

  const semDias = pendentes.dias.length === 0;

  return (
    <>
      {migalha}
      <section className="flex flex-col gap-1">
        <h1 className="text-lg leading-[1.2] font-semibold tracking-[-0.02em] tablet:text-[26px]">Pendentes</h1>
        <p className="text-xs text-muted-foreground">
          Quem comprou e ainda não pagou. Ao receber, escolha Pix ou dinheiro.
        </p>
      </section>

      {!semDias && (
        <FiltroDePendentes
          dias={pendentes.dias}
          hoje={dados.hoje}
          periodo={pendentes.periodo}
          aoEscolher={(periodo) =>
            startTransition(() => {
              setPeriodoEscolhido(periodo);
              setEscolhendo(null);
            })
          }
          busca={busca}
          aoBuscar={setBusca}
        />
      )}

      <TrocaSuave>
        <NumerosDePendentes numeros={pendentes.numeros} />

        <div className="order-4 flex flex-col gap-4 tablet:gap-5">
          {semDias ? (
            <SemPendentes titulo="Nenhum dia de venda ainda">
              <Button asChild variant="outline">
                <Link transitionTypes={["tela"]} href="/vendas">
                  Criar o primeiro dia em Vendas
                </Link>
              </Button>
            </SemPendentes>
          ) : pendentes.grupos.length === 0 ? (
            <SemPendentes titulo={busca.trim() ? "Ninguém encontrado" : "Nada pendente aqui"}>
              <span className="text-[11px] text-muted-foreground">
                {busca.trim() ? "Nenhum pendente com esse nome neste período." : "Todo mundo deste período já pagou."}
              </span>
            </SemPendentes>
          ) : (
            pendentes.grupos.map((grupo) => (
              <GrupoDePendentes
                key={grupo.chave}
                grupo={grupo}
                escolhendo={escolhendo}
                aoEscolher={setEscolhendo}
                aoReceber={(pedidoId, pagamentoId) => {
                  setRecebidos((atual) => new Map(atual).set(pedidoId, pagamentoId));
                  setEscolhendo(null);
                }}
              />
            ))
          )}
        </div>
      </TrocaSuave>
    </>
  );
}
