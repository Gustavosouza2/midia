import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { CantinaLocalDb } from "./index";

describe("banco local", () => {
  it("guarda itens na outbox em ordem de chegada", async () => {
    const db = new CantinaLocalDb();
    const agora = new Date().toISOString();

    await db.outbox.add({
      tabela: "pedidos",
      registroId: crypto.randomUUID(),
      operacao: "inserir",
      payload: { status: "recebido" },
      criadoEm: agora,
    });
    await db.outbox.add({
      tabela: "pagamentos",
      registroId: crypto.randomUUID(),
      operacao: "inserir",
      payload: { valorCentavos: 1200 },
      criadoEm: agora,
    });

    const fila = await db.outbox.orderBy("id").toArray();
    expect(fila.map((item) => item.tabela)).toEqual(["pedidos", "pagamentos"]);
    db.close();
  });

  it("busca o cardápio de um dia em precosDoDia", async () => {
    const db = new CantinaLocalDb();
    const cantinaId = crypto.randomUUID();
    const [dia, outroDia] = [crypto.randomUUID(), crypto.randomUUID()];
    const preco = (diaId: string, precoCentavos: number) => ({
      id: crypto.randomUUID(),
      cantinaId,
      diaId,
      produtoId: crypto.randomUUID(),
      precoCentavos,
      ativo: true,
      quantidade: null,
      atualizadoEm: new Date().toISOString(),
      seq: 1,
    });

    await db.precosDoDia.bulkAdd([preco(dia, 1200), preco(dia, 600), preco(outroDia, 1000)]);

    const cardapio = await db.precosDoDia.where("diaId").equals(dia).toArray();
    expect(cardapio.map((p) => p.precoCentavos).sort()).toEqual([1200, 600].sort());
    db.close();
  });
});
