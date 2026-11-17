"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { Cart } from "@/lib/cart";
import type { MenuItem } from "@/lib/sales";
import { ProductTile } from "./product-tile";

/** The day's items as big buttons: each tap adds one unit to the order being put together. */
export function ProductGrid({
  menu,
  cart,
  onAdd,
}: {
  menu: MenuItem[];
  cart: Cart;
  onAdd: (productId: string) => void;
}) {
  return (
    <section aria-labelledby="day-items" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="day-items" className="text-sm font-semibold">
          Toque para adicionar
        </h2>
        <Link
          transitionTypes={["screen"]}
          href="/menu"
          className="text-[11px] text-muted-foreground underline underline-offset-[3px] hover:text-foreground"
        >
          Editar cardápio do dia
        </Link>
      </div>

      {menu.length === 0 ? (
        <Card className="items-center gap-1 px-5 py-8 text-center">
          <p className="text-xs text-muted-foreground">Nenhum item à venda neste dia.</p>
          <Link
            transitionTypes={["screen"]}
            href="/menu"
            className="text-xs font-semibold text-foreground underline underline-offset-[3px]"
          >
            Monte o cardápio do dia
          </Link>
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-2 tablet:grid-cols-3 wide:grid-cols-4">
          {menu.map((item) => (
            <li key={item.productId} className="flex">
              <ProductTile
                item={item}
                inCart={cart.find((l) => l.productId === item.productId)?.quantity ?? 0}
                onAdd={() => onAdd(item.productId)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
