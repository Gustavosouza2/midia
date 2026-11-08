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
});
