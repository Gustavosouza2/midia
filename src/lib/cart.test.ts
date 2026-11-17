import { describe, expect, it } from "vitest";
import { addToCart, cartLines, cartTotal, orderLines, setQuantity, type Cart } from "./cart";
import type { MenuItem } from "./sales";

const menu: MenuItem[] = [
  { productId: "beef", name: "Espeto", priceCents: 1200, remaining: 2 },
  { productId: "soda", name: "Refri", priceCents: 600, remaining: null },
];

describe("cart", () => {
  it("each tap adds one unit, in the order the items were tapped", () => {
    let cart: Cart = [];
    cart = addToCart(cart, menu, "soda");
    cart = addToCart(cart, menu, "beef");
    cart = addToCart(cart, menu, "soda");
    expect(cart).toEqual([
      { productId: "soda", quantity: 2 },
      { productId: "beef", quantity: 1 },
    ]);
  });

  it("stops at what remains on the day", () => {
    let cart: Cart = [];
    for (let i = 0; i < 5; i++) cart = addToCart(cart, menu, "beef");
    expect(cart).toEqual([{ productId: "beef", quantity: 2 }]);
    expect(setQuantity(cart, menu, "beef", 9)).toEqual([{ productId: "beef", quantity: 2 }]);
  });

  it("zero takes the item out; unknown items are ignored", () => {
    const cart = addToCart([], menu, "beef");
    expect(setQuantity(cart, menu, "beef", 0)).toEqual([]);
    expect(addToCart(cart, menu, "gone")).toBe(cart);
  });

  it("prices the lines from the menu and drops what left it", () => {
    const cart: Cart = [
      { productId: "beef", quantity: 2 },
      { productId: "gone", quantity: 1 },
      { productId: "soda", quantity: 1 },
    ];
    const lines = cartLines(cart, menu);
    expect(lines.map((l) => [l.name, l.amount])).toEqual([["Espeto", 2400], ["Refri", 600]]);
    expect(cartTotal(lines)).toBe(3000);
    expect(orderLines(lines)).toEqual([
      { productId: "beef", quantity: 2, unitPriceCents: 1200 },
      { productId: "soda", quantity: 1, unitPriceCents: 600 },
    ]);
  });
});
