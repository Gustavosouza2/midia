import type { OrderItem, Order, DayMenuItem, Product } from "@/local-db";
import { dayStock, type Stock } from "./stock";

/** Everything the Menu reads from the local database. */
export type MenuData = {
  products: Product[];
  dayMenuItems: DayMenuItem[];
  orders: Order[];
  items: OrderItem[];
};

export type MenuItem = {
  product: Product;
  /** Price on this day; with no row in precos_do_dia, the default price. */
  priceCents: number;
  differsFromDefault: boolean;
  forSale: boolean;
  /** Quantity, sold (reservations included) and what remains on this day. */
  stock: Stock;
};

export type Menu = {
  /** Active items in alphabetical order, so a row does not move when the switch is turned on or off. */
  items: MenuItem[];
  forSale: number;
};

/** Builds a day's Menu list from the local database rows. */
export function buildMenu(data: MenuData, dayId: string): Menu {
  const menuItemByProduct = new Map(data.dayMenuItems.filter((p) => p.dayId === dayId).map((p) => [p.productId, p]));
  const stock = dayStock(data, dayId);

  const items = data.products
    .filter((p) => p.active)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
    .map((product): MenuItem => {
      const row = menuItemByProduct.get(product.id);
      const priceCents = row?.priceCents ?? product.priceCents;
      return {
        product,
        priceCents,
        differsFromDefault: priceCents !== product.priceCents,
        forSale: row?.active ?? false,
        stock: stock(product.id),
      };
    });

  return { items, forSale: items.filter((i) => i.forSale).length };
}

/** "12", "12,5", "12,50" or "R$ 12,50" → cents. Null if it is not an amount in reais above zero. */
export function parseReais(text: string): number | null {
  const clean = text.trim().replace(/^R\$\s*/i, "");
  const parts = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(clean);
  if (!parts) return null;
  const cents = Number(parts[1]) * 100 + Number((parts[2] ?? "").padEnd(2, "0"));
  return cents > 0 ? cents : null;
}

/** Cents → price input text: "12" or "12,50". */
export function formatReaisInput(cents: number): string {
  const reais = Math.floor(cents / 100);
  const remainder = cents % 100;
  return remainder ? `${reais},${String(remainder).padStart(2, "0")}` : String(reais);
}

/** Quantity input text: "" (no limit) or "50". Integer ≥ 0; anything else = undefined (invalid). */
export function parseQuantity(text: string): number | null | undefined {
  const clean = text.trim();
  if (!clean) return null;
  return /^\d{1,5}$/.test(clean) ? Number(clean) : undefined;
}
