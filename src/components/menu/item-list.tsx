import type { SaleDay } from "@/local-db";
import type { Menu } from "@/lib/menu";
import { longDate } from "@/lib/format";
import { RemoveDay } from "../day/remove-day";
import { COLUMNS } from "./columns";
import { ItemRow } from "./item-row";
import { NewItem } from "./new-item";

/** Up to 1180px: one card per item (two per row from tablet up). Above: a table inside a card. */
export function ItemList({ day, menu }: { day: SaleDay; menu: Menu }) {
  const longLabel = longDate(day.date);
  const total = menu.items.length;

  return (
    <section
      aria-label="Itens do cardápio"
      className="flex flex-col gap-2.5 wide:gap-0 wide:overflow-hidden wide:rounded-xl wide:border wide:border-border wide:bg-card"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-1 wide:px-5 wide:pt-4 wide:pb-3">
        <div className="flex flex-wrap items-baseline gap-x-2.5">
          <h2 className="text-sm font-semibold">
            Itens em {longLabel[0].toLowerCase()}
            {longLabel.slice(1)}
          </h2>
          <RemoveDay day={day} />
        </div>
        <span className="text-[11px] text-muted-foreground">
          {menu.forSale} de {total} {total === 1 ? "item" : "itens"} à venda
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card p-3.5 wide:rounded-none wide:border-x-0 wide:border-b-0 wide:bg-transparent wide:px-5 wide:py-3">
        <NewItem dayId={day.id} />
      </div>

      {total > 0 && (
        <>
          <div
            aria-hidden="true"
            className={`hidden gap-4 border-t border-border bg-muted px-5 py-2.5 text-[11px] text-muted-foreground wide:grid ${COLUMNS}`}
          >
            <span>Item</span>
            <span>Preço neste dia</span>
            <span>Quantidade</span>
            <span>Vendidos</span>
            <span>No cardápio do dia</span>
          </div>
          <ul className="flex flex-col gap-2.5 tablet:grid tablet:grid-cols-2 tablet:items-start wide:flex wide:items-stretch wide:gap-0">
            {menu.items.map((item) => (
              <ItemRow key={item.product.id} dayId={day.id} item={item} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
