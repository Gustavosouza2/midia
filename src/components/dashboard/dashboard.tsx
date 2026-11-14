"use client";

import { startTransition, useMemo, useState } from "react";
import { FiltroDeDia } from "@/components/day/day-filter";
import { lerBancoLocal } from "@/local-db/read-local-db";
import { useLeituraLocal } from "@/local-db/use-local-query";
import { montarPainel, type Periodo } from "@/lib/dashboard";
import { TrocaSuave } from "../transitions/smooth-swap";
import { BoasVindas } from "./welcome";
import { MigalhaDoPainel } from "./dashboard-breadcrumb";
import { NumerosDoPainel } from "./dashboard-stats";
import { PrecisaDeAtencao } from "./needs-attention";
import { VendidoPorDia } from "./sold-per-day";

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
