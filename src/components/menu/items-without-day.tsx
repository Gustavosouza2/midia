import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Produto } from "@/local-db";
import { formatarBRL, iniciais } from "@/lib/format";

/** Itens cadastrados antes do primeiro dia de venda, com o preço padrão de cada um. */
export function ItensSemDia({ produtos }: { produtos: Produto[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Itens cadastrados</CardTitle>
        <CardDescription>
          Ao criar o primeiro dia, eles entram à venda com estes preços. A quantidade de cada um se define no dia.
        </CardDescription>
      </CardHeader>
      <ul aria-label="Itens cadastrados">
        {produtos.map((produto) => (
          <li
            key={produto.id}
            className="flex items-center gap-3 border-t border-border px-3.5 py-3 animate-in duration-300 fade-in tablet:px-5"
          >
            <span className="flex size-8 flex-none items-center justify-center rounded-lg border border-border bg-muted text-[11px] font-semibold">
              {iniciais(produto.nome)}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{produto.nome}</span>
            <span className="text-[11px] text-muted-foreground">Preço padrão</span>
            <strong className="font-semibold">{formatarBRL(produto.precoCentavos)}</strong>
          </li>
        ))}
      </ul>
    </Card>
  );
}
