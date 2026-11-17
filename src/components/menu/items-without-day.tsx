import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/local-db";
import { formatBRL, initials } from "@/lib/format";
import { NewItem } from "./new-item";

/**
 * Items registered before the first sale day, with each one's default price, and the inline row to add more.
 * With no items it is the first-use card, focused on the name so the first item is one Enter away.
 */
export function ItemsWithoutDay({ products }: { products: Product[] }) {
  const empty = products.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{empty ? "Nenhum item no cardápio ainda" : "Itens cadastrados"}</CardTitle>
        <CardDescription>
          {empty
            ? "Cadastre o que a cantina vende, com o preço padrão."
            : "Entram à venda com estes preços quando o dia é aberto."}
        </CardDescription>
      </CardHeader>
      <div className="px-3.5 pb-3.5 tablet:px-5">
        <NewItem dayId={null} autoFocus={empty} />
      </div>
      {!empty && (
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
      )}
    </Card>
  );
}
