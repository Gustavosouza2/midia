import { plural, rotuloDia } from "@/lib/formato";
import type { ResumoPedido } from "@/lib/painel";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Grupo } from "./grupo";
import { Idade } from "./idade";
import { LinhaDePedido } from "./linha-de-pedido";

/** Quantos pendentes o Painel mostra; o resto fica na tela Pendentes. */
const PENDENTES_VISIVEIS = 3;

export function PrecisaDeAtencao({
  reservas,
  pendentes,
  pessoasPendentes,
}: {
  reservas: ResumoPedido[];
  /** Do mais antigo para o mais novo. */
  pendentes: ResumoPedido[];
  pessoasPendentes: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Precisa de atenção</CardTitle>
        <CardDescription className="hidden tablet:block">Reservas a entregar e pendentes antigos</CardDescription>
      </CardHeader>
      {reservas.length > 0 && (
        <>
          <Grupo cor="bg-text-2" titulo="Reservas para entregar" contagem={String(reservas.length)} />
          {reservas.map((r) => (
            <LinhaDePedido
              key={r.id}
              pedido={r}
              meta={r.descricao}
              valor={r.valor}
              detalhe={<span className="text-[11px] text-muted-foreground">para {rotuloDia(r.data)}</span>}
              avatar="bg-accent"
            />
          ))}
        </>
      )}

      <Grupo cor="bg-warn" titulo="Pendentes há mais tempo" contagem={plural(pessoasPendentes, "pessoa", "pessoas")} />
      {pendentes.length === 0 ? (
        <p className="border-t border-border px-3.5 py-4 text-[11px] text-muted-foreground tablet:px-5">
          Ninguém devendo neste período.
        </p>
      ) : (
        <>
          {pendentes.slice(0, PENDENTES_VISIVEIS).map((p) => (
            <LinhaDePedido
              key={p.id}
              pedido={p}
              meta={`${p.descricao} · ${rotuloDia(p.data)}`}
              valor={p.aberto}
              detalhe={<Idade dias={p.idadeDias} />}
              avatar="border border-border bg-muted"
            />
          ))}
          <CardFooter className="p-0 tablet:p-0">
            <Link transitionTypes={["tela"]}
              href="/pendentes"
              className="flex w-full items-center justify-between px-3.5 py-3 text-xs text-text-2 hover:bg-accent tablet:px-5"
            >
              Ver todos os pendentes ({pendentes.length})
              <ArrowRight className="size-3.5" />
            </Link>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
