import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/local-db";
import { formatBRL, initials } from "@/lib/format";

/** Items registered before the first sale day, with each one's default price. */
export function ItemsWithoutDay({ products }: { products: Product[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Itens cadastrados</CardTitle>
        <CardDescription>
          Ao criar o primeiro dia, eles entram à venda com estes preços. A quantidade de cada um se define no dia.
        </CardDescription>
      </CardHeader>
      <ul aria-label="Itens cadastrados">
        {products.map((product) => (
          <li
            key={product.id}
            className="flex items-center gap-3 border-t border-border px-3.5 py-3 animate-in duration-300 fade-in tablet:px-5"
          >
            <span className="flex size-8 flex-none items-center justify-center rounded-lg border border-border bg-muted text-[11px] font-semibold">
              {initials(product.name)}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{product.name}</span>
            <span className="text-[11px] text-muted-foreground">Preço padrão</span>
            <strong className="font-semibold">{formatBRL(product.priceCents)}</strong>
          </li>
        ))}
      </ul>
    </Card>
  );
}
