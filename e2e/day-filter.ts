import type { Page } from "@playwright/test";
import { rotuloComSemana } from "../src/lib/format";

/** "AAAA-MM-DD" → "Dom, 15 nov", como no filtro de dia. */
export const rotuloDoFiltro = rotuloComSemana;

/** O filtro de dia ‹ [dia ▾] › da tela. `rotulo` é o nome do grupo: "Período" no Painel, "Dia de venda" nas outras. */
export function filtroDeDia(page: Page, rotulo: "Período" | "Dia de venda" = "Dia de venda") {
  const grupo = page.getByRole("group", { name: rotulo, exact: true });
  const lista = page.getByRole("dialog", { name: "Escolher dia" });
  const gatilho = grupo.locator('[aria-haspopup="dialog"]');
  return {
    gatilho,
    anterior: grupo.getByRole("button", { name: "Dia anterior" }),
    seguinte: grupo.getByRole("button", { name: "Dia seguinte" }),
    lista,
    /** Abre a lista e escolhe o item que começa com `texto` ("Todos os dias" ou "Dom, 15 nov"). */
    async escolher(texto: string) {
      await gatilho.click();
      await lista.getByRole("button", { name: new RegExp(`^${texto}`) }).click();
    },
  };
}
