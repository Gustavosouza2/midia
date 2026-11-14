import { expect, test } from "@playwright/test";
import { date, writeLocalDb, id, row } from "./local-db";
import { dayFilter, filterLabel } from "./day-filter";

test("the Dashboard shows the stats from the local database", async ({ page }) => {
  await page.goto("/");
  // The title only appears after the first read, so the local database already exists.
  await expect(page.getByRole("heading", { name: "Painel da Cantina" })).toBeVisible();

  await writeLocalDb(page, {
    products: [row.product(1, "Espeto de carne", 1000)],
    saleDays: [row.day(10, date(-17)), row.day(11, date(5))],
    customers: [row.customer(20, "Charlene"), row.customer(21, "Melina"), row.customer(22, "Gustavo")],
    orders: [
      row.order(30, id(10), id(20), "entregue"),
      row.order(31, id(10), id(21), "entregue"),
      row.order(32, id(11), id(22), "recebido"),
    ],
    orderItems: [
      row.item(40, id(30), id(1), 3, 1000),
      row.item(41, id(31), id(1), 2, 1000),
      row.item(42, id(32), id(1), 3, 1200),
    ],
    payments: [row.payment(50, id(30), 3000)],
  });
  await page.reload();

  await expect(page.getByText("60% de R$ 50 vendidos")).toBeVisible();
  await expect(page.getByText("R$ 30", { exact: true })).toBeVisible();
  await expect(page.getByText("R$ 36 a entregar")).toBeVisible();
  await expect(page.getByText("1 reserva feita")).toBeVisible();

  // "Precisa de atenção": the old pending order and the reservation for the upcoming day.
  await expect(page.getByText("Melina")).toBeVisible();
  await expect(page.getByText("há 17 dias")).toBeVisible();
  await expect(page.getByText("Gustavo")).toBeVisible();

  // Filtering by the past day removes the upcoming day's reservation from the stats.
  await dayFilter(page, "Período").select(filterLabel(date(-17)));
  await expect(page.getByText("nenhuma neste período")).toBeVisible();
});

test("the menu counts pending orders and the Dashboard links to Pending and Sales", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Painel da Cantina" })).toBeVisible();
  await writeLocalDb(page, {
    products: [row.product(1, "Espeto de carne", 1000)],
    saleDays: [row.day(10, date(-3))],
    customers: [row.customer(20, "Melina")],
    orders: [row.order(30, id(10), id(20), "entregue")],
    orderItems: [row.item(40, id(30), id(1), 2, 1000)],
  });
  await page.reload();

  const menu = page.getByRole("navigation", { name: "Menu principal" });
  await expect(menu.getByLabel("1 em aberto")).toBeVisible();

  await page.getByRole("link", { name: /Ver todos os pendentes/ }).click();
  await expect(page).toHaveURL(/\/pending$/);
  await expect(page.getByText("Melina")).toBeVisible();

  await menu.getByRole("link", { name: "Painel" }).click();
  await page.getByRole("link", { name: "Nova venda" }).click();
  await expect(page).toHaveURL(/\/sales$/);
});
