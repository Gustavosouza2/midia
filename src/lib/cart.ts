import type { OrderLine } from "@/local-db/writes";
import type { MenuItem } from "./sales";

/** What is in the sale being put together: quantity by product, in the order items were tapped. */
export type Cart = { productId: string; quantity: number }[];

export type CartLine = MenuItem & { quantity: number; amount: number };

/** One more unit, never past what remains on the day. A product off the menu is ignored. */
export function addToCart(cart: Cart, menu: MenuItem[], productId: string): Cart {
  const item = menu.find((m) => m.productId === productId);
  if (!item) return cart;
  const current = cart.find((l) => l.productId === productId)?.quantity ?? 0;
  return setQuantity(cart, menu, productId, current + 1);
}

/** Sets the quantity, capped at what remains; zero or less takes the product out. */
export function setQuantity(cart: Cart, menu: MenuItem[], productId: string, quantity: number): Cart {
  const item = menu.find((m) => m.productId === productId);
  const capped = item?.remaining == null ? quantity : Math.min(quantity, item.remaining);
  if (!item || capped <= 0) return cart.filter((l) => l.productId !== productId);
  return cart.some((l) => l.productId === productId)
    ? cart.map((l) => (l.productId === productId ? { ...l, quantity: capped } : l))
    : [...cart, { productId, quantity: capped }];
}

/** Lines priced from the day's menu. Products that left the menu drop out. */
export function cartLines(cart: Cart, menu: MenuItem[]): CartLine[] {
  return cart.flatMap((line) => {
    const item = menu.find((m) => m.productId === line.productId);
    return item ? [{ ...item, quantity: line.quantity, amount: line.quantity * item.priceCents }] : [];
  });
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.amount, 0);
}

export function orderLines(lines: CartLine[]): OrderLine[] {
  return lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPriceCents: l.priceCents }));
}
