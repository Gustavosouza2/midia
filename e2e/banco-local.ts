import type { Page } from "@playwright/test";

/** Data local "AAAA-MM-DD" deslocada em `dias` a partir de hoje. */
export function data(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-11-01" → "01 nov", como nas abas de dia. */
export const rotulo = (quando: string) => `${quando.slice(8)} ${MESES[Number(quando.slice(5, 7)) - 1]}`;

/** UUID fixo a partir de um número, para os dados de teste. */
export const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const CANTINA_ID = "c0000000-0000-4000-8000-000000000001";
const base = () => ({ cantinaId: CANTINA_ID, atualizadoEm: new Date().toISOString(), seq: 1 });

/** Construtores de linhas do banco local, com os campos obrigatórios preenchidos. */
export const linha = {
  cantina: () => ({ id: CANTINA_ID, nome: "Mídia", slug: "midia", atualizadoEm: new Date().toISOString(), seq: 1 }),
  produto: (n: number, nome: string, precoCentavos: number, ativo = true) => ({
    ...base(), id: id(n), nome, precoCentavos, ativo,
  }),
  dia: (n: number, quando: string, nome: string | null = null) => ({
    ...base(), id: id(n), data: quando, nome, fechadoEm: null, canceladoEm: null,
  }),
  precoDoDia: (
    n: number, diaId: string, produtoId: string, precoCentavos: number, ativo = true, quantidade: number | null = null,
  ) => ({
    ...base(), id: id(n), diaId, produtoId, precoCentavos, ativo, quantidade,
  }),
  cliente: (n: number, nome: string) => ({ ...base(), id: id(n), nome, telefone: null }),
  pedido: (n: number, diaId: string, clienteId: string | null, status: "recebido" | "entregue") => ({
    ...base(), id: id(n), diaId, clienteId, origem: "balcao", status, vendedorId: null,
    criadoEm: new Date().toISOString(), entregueEm: status === "entregue" ? new Date().toISOString() : null,
  }),
  item: (n: number, pedidoId: string, produtoId: string, quantidade: number, precoUnitarioCentavos: number) => ({
    ...base(), id: id(n), pedidoId, produtoId, quantidade, precoUnitarioCentavos, canceladoEm: null,
  }),
  pagamento: (n: number, pedidoId: string, valorCentavos: number, forma: "pix" | "dinheiro" = "pix") => ({
    ...base(), id: id(n), pedidoId, valorCentavos, forma, vendedorId: null,
    registradoEm: new Date().toISOString(), estornadoEm: null,
  }),
};

async function abrirBanco(page: Page) {
  // O banco só existe depois que o app abriu uma vez (o Dexie cria as stores).
  await page.waitForFunction(async () => (await indexedDB.databases()).some((d) => d.name === "cantina"));
}

/** Grava linhas direto no IndexedDB do app (o banco "cantina" criado pelo Dexie). */
export async function gravarNoBancoLocal(page: Page, linhas: Record<string, object[]>) {
  await abrirBanco(page);
  await page.evaluate(async (linhas) => {
    const db = await new Promise<IDBDatabase>((ok, erro) => {
      const pedido = indexedDB.open("cantina");
      pedido.onsuccess = () => ok(pedido.result);
      pedido.onerror = () => erro(pedido.error);
    });
    const tx = db.transaction(Object.keys(linhas), "readwrite");
    for (const [tabela, registros] of Object.entries(linhas)) {
      for (const registro of registros) tx.objectStore(tabela).put(registro);
    }
    await new Promise((ok, erro) => {
      tx.oncomplete = ok;
      tx.onerror = () => erro(tx.error);
    });
    db.close();
  }, linhas);
}

/** Lê todas as linhas de uma tabela do IndexedDB do app. */
export async function lerTabela<T = Record<string, unknown>>(page: Page, tabela: string): Promise<T[]> {
  await abrirBanco(page);
  return page.evaluate(async (tabela) => {
    const db = await new Promise<IDBDatabase>((ok, erro) => {
      const pedido = indexedDB.open("cantina");
      pedido.onsuccess = () => ok(pedido.result);
      pedido.onerror = () => erro(pedido.error);
    });
    const linhas = await new Promise<unknown[]>((ok, erro) => {
      const pedido = db.transaction(tabela).objectStore(tabela).getAll();
      pedido.onsuccess = () => ok(pedido.result);
      pedido.onerror = () => erro(pedido.error);
    });
    db.close();
    return linhas;
  }, tabela) as Promise<T[]>;
}
