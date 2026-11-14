import { describe, expect, it } from "vitest";
import type { OrderItem, Order, DayMenuItem, Product } from "@/local-db";
import { parseQuantity, parseReais, buildMenu, formatReaisInput, type MenuData } from "./menu";

const CANTEEN = "c0000000-0000-4000-8000-000000000000";
const DAY = "d0000000-0000-4000-8000-000000000001";
const OTHER_DAY = "d0000000-0000-4000-8000-000000000002";
const sync = { updatedAt: "2026-11-01T00:00:00.000Z", seq: 1 };

const product = (id: string, name: string, priceCents: number, active = true): Product => ({
  id,
  canteenId: CANTEEN,
  name,
  priceCents,
  active,
  ...sync,
});

const price = (
  dayId: string,
  productId: string,
  priceCents: number,
  active = true,
  quantity: number | null = null,
): DayMenuItem => ({
  id: `${dayId}-${productId}`,
  canteenId: CANTEEN,
  dayId,
  productId,
  priceCents,
  active,
  quantity,
  ...sync,
});

const order = (id: string, dayId: string, status: Order["status"] = "entregue"): Order => ({
  id,
  canteenId: CANTEEN,
  dayId,
  customerId: null,
  origin: "balcao",
  status,
  sellerId: null,
  createdAt: "2026-11-01T20:00:00.000Z",
  deliveredAt: null,
  ...sync,
});

const item = (orderId: string, productId: string, quantity: number, canceledAt: string | null = null): OrderItem => ({
  id: `${orderId}-${productId}-${quantity}`,
  orderId,
  canteenId: CANTEEN,
  productId,
  quantity,
  unitPriceCents: 1000,
  canceledAt,
  ...sync,
});

const emptyMessage = (): MenuData => ({ products: [], dayMenuItems: [], orders: [], items: [] });

describe("buildMenu", () => {
  it("uses the day price and, with no row for the day, the default price", () => {
    const data = emptyMessage();
    data.products.push(product("espeto", "Espeto de carne", 1200), product("refri", "Refrigerante lata", 600));
    data.dayMenuItems.push(price(DAY, "espeto", 1000), price(OTHER_DAY, "refri", 500));

    const { items } = buildMenu(data, DAY);

    expect(items.map((i) => [i.product.name, i.priceCents, i.forSale])).toEqual([
      ["Espeto de carne", 1000, true],
      ["Refrigerante lata", 600, false],
    ]);
  });

  it("flags an item priced differently from the default, for sale or not", () => {
    const data = emptyMessage();
    data.products.push(product("a", "Água", 300), product("b", "Bolo", 500), product("c", "Café", 200));
    data.dayMenuItems.push(price(DAY, "a", 300), price(DAY, "b", 450), price(DAY, "c", 250, false));

    const { items } = buildMenu(data, DAY);

    expect(items.map((i) => i.differsFromDefault)).toEqual([false, true, true]);
  });

  it("counts the day's sold units without canceled orders or items", () => {
    const data = emptyMessage();
    data.products.push(product("espeto", "Espeto de carne", 1200));
    data.orders.push(
      order("p1", DAY),
      order("p2", DAY, "recebido"),
      order("p3", DAY, "cancelado"),
      order("p4", OTHER_DAY),
    );
    data.items.push(
      item("p1", "espeto", 3),
      item("p1", "espeto", 5, "2026-11-01T21:00:00.000Z"),
      item("p2", "espeto", 2),
      item("p3", "espeto", 7),
      item("p4", "espeto", 11),
    );

    expect(buildMenu(data, DAY).items[0].stock.soldUnits).toBe(5);
  });

  it("brings the day quantity and what remains; without a quantity, no limit", () => {
    const data = emptyMessage();
    data.products.push(product("espeto", "Espeto de carne", 1200), product("refri", "Refrigerante", 600));
    data.dayMenuItems.push(price(DAY, "espeto", 1200, true, 50), price(DAY, "refri", 600, true, 2));
    data.orders.push(order("p1", DAY), order("p2", DAY, "recebido"));
    data.items.push(item("p1", "espeto", 18), item("p1", "refri", 1), item("p2", "refri", 1));

    const [skewer, soda] = buildMenu(data, DAY).items;
    expect(skewer.stock).toMatchObject({ quantity: 50, remaining: 32, soldOut: false });
    expect(soda.stock).toMatchObject({ quantity: 2, remaining: 0, soldOut: true });
    expect(buildMenu(data, OTHER_DAY).items[0].stock).toMatchObject({ quantity: null, remaining: null });
  });

  it("lists only active items, alphabetically, and counts those for sale", () => {
    const data = emptyMessage();
    data.products.push(
      product("r", "refrigerante", 600),
      product("v", "Velho", 100, false),
      product("e", "Espeto", 1200),
      product("a", "Água", 300),
    );
    data.dayMenuItems.push(price(DAY, "e", 1200), price(DAY, "a", 300, false), price(DAY, "v", 100));

    const menu = buildMenu(data, DAY);

    expect(menu.items.map((i) => i.product.name)).toEqual(["Água", "Espeto", "refrigerante"]);
    expect(menu.forSale).toBe(1);
  });
});

describe("parseQuantity", () => {
  it("empty is no limit; integers ≥ 0 are valid; the rest is invalid", () => {
    expect(parseQuantity("  ")).toBeNull();
    expect(parseQuantity("0")).toBe(0);
    expect(parseQuantity(" 50 ")).toBe(50);
    for (const text of ["-1", "2,5", "abc", "1e3"]) expect(parseQuantity(text)).toBeUndefined();
  });
});

describe("parseReais", () => {
  it.each([
    ["12", 1200],
    ["12,50", 1250],
    ["12,5", 1250],
    ["12.05", 1205],
    [" R$ 7 ", 700],
    ["0,01", 1],
  ])("%s → %i centavos", (text, cents) => {
    expect(parseReais(text)).toBe(cents);
  });

  it.each(["", "0", "0,00", "12,505", "-3", "abc", "1.000,00"])("recusa %j", (text) => {
    expect(parseReais(text)).toBeNull();
  });
});

describe("formatReaisInput", () => {
  it("shows cents only when there are any", () => {
    expect(formatReaisInput(1200)).toBe("12");
    expect(formatReaisInput(1250)).toBe("12,50");
    expect(formatReaisInput(1205)).toBe("12,05");
  });
});
