import type { Page } from "@playwright/test";
import { weekdayDate } from "../src/lib/format";

/** "YYYY-MM-DD" → "Dom, 15 nov", as in the day filter. */
export const filterLabel = weekdayDate;

/** The screen's day filter ‹ [day ▾] ›. `label` is the group name: "Período" on the Dashboard, "Dia de venda" on the others. */
export function dayFilter(page: Page, label: "Período" | "Dia de venda" = "Dia de venda") {
  const group = page.getByRole("group", { name: label, exact: true });
  const list = page.getByRole("dialog", { name: "Escolher dia" });
  const trigger = group.locator('[aria-haspopup="dialog"]');
  return {
    trigger,
    previous: group.getByRole("button", { name: "Dia anterior" }),
    next: group.getByRole("button", { name: "Dia seguinte" }),
    list,
    /** Opens the list and picks the item that starts with `text` ("Todos os dias" or "Dom, 15 nov"). */
    async select(text: string) {
      await trigger.click();
      await list.getByRole("button", { name: new RegExp(`^${text}`) }).click();
    },
  };
}
