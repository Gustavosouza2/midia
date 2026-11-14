"use client";

import { startTransition, useMemo, useState } from "react";
import { FiltroDeDia } from "@/componentes/dia/filtro-de-dia";
import { lerBancoLocal } from "@/local-db/ler-banco-local";
import { useLeituraLocal } from "@/local-db/use-leitura-local";
import { montarPainel, type Periodo } from "@/lib/painel";
import { TrocaSuave } from "../transicoes/troca-suave";
import { BoasVindas } from "./boas-vindas";
import { MigalhaDoPainel } from "./migalha-do-painel";
import { NumerosDoPainel } from "./numeros-do-painel";
import { PrecisaDeAtencao } from "./precisa-de-atencao";
import { VendidoPorDia } from "./vendido-por-dia";

export function Painel() {
  const dados = useLeituraLocal(lerBancoLocal);
  const [periodo, setPeriodo] = useState<Periodo>("todos");
  const escolherPeriodo = (p: Periodo) => startTransition(() => setPeriodo(p));
  const painel = useMemo(() => dados && montarPainel(dados, periodo, dados.hoje), [dados, periodo]);

  if (!dados || !painel) {
    return (
      <>
        <MigalhaDoPainel />
        <p className="text-[11px] text-muted-foreground" role="status">
          Carregando…
        </p>
      </>
    );
  }

  return (
    <>
      <MigalhaDoPainel />
      <TrocaSuave>
        <BoasVindas proximo={painel.proximo} reservas={painel.reservasDoProximo} />

        <section className="flex flex-col gap-3">
          <FiltroDeDia
            dias={painel.dias}
            hoje={dados.hoje}
            valor={periodo}
            aoEscolher={escolherPeriodo}
            rotulo="Período"
            todos
          />
          <NumerosDoPainel numeros={painel.numeros} />
        </section>

        <section className="grid items-start gap-4 tablet:gap-5 wide:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <VendidoPorDia dias={painel.porDia} periodo={periodo} aoEscolher={escolherPeriodo} />
          <PrecisaDeAtencao
            reservas={painel.reservas}
            pendentes={painel.pendentes}
            pessoasPendentes={painel.numeros.pessoasPendentes}
          />
        </section>
      </TrocaSuave>
    </>
  );
}
