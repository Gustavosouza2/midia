import Link from "next/link";
import type { Periodo, ResumoDia } from "@/lib/painel";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Legenda } from "./legenda";
import { LinhaDoDia } from "./linha-do-dia";

export function VendidoPorDia({
  dias,
  periodo,
  aoEscolher,
}: {
  dias: ResumoDia[];
  periodo: Periodo;
  aoEscolher: (periodo: Periodo) => void;
}) {
  const maiorVendido = Math.max(1, ...dias.map((d) => d.vendido));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendido por dia</CardTitle>
        <CardDescription className="hidden tablet:block">Toque em um dia para ver só ele</CardDescription>
        <CardAction>
          <Legenda />
        </CardAction>
      </CardHeader>
      {dias.length === 0 ? (
        <p className="border-t border-border px-3.5 py-6 text-[11px] text-muted-foreground tablet:px-5">
          Nenhum dia de venda ainda.{" "}
          <Link transitionTypes={["tela"]} href="/vendas" className="text-foreground underline underline-offset-4">
            Criar o primeiro dia em Vendas
          </Link>
        </p>
      ) : (
        dias.map((d) => (
          <LinhaDoDia
            key={d.dia.id}
            resumo={d}
            escala={maiorVendido}
            selecionado={periodo === d.dia.id}
            apagado={periodo !== "todos" && periodo !== d.dia.id}
            aoClicar={() => aoEscolher(periodo === d.dia.id ? "todos" : d.dia.id)}
          />
        ))
      )}
    </Card>
  );
}
