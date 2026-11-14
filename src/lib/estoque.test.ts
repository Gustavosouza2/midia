import { describe, expect, it } from "vitest";
import type { ItemPedido, Pedido, PrecoDoDia } from "@/local-db";
import { estoqueDoDia } from "./estoque";

const CANTINA = "c0000000-0000-4000-8000-000000000000";
const DIA = "d1";
const OUTRO_DIA = "d2";
const sync = { atualizadoEm: "2026-11-01T00:00:00.000Z", seq: 1 };

const preco = (diaId: string, produtoId: string, quantidade: number | null): PrecoDoDia => ({
  id: `${diaId}-${produtoId}`,
  cantinaId: CANTINA,
  diaId,
  produtoId,
  precoCentavos: 1200,
  ativo: true,
  quantidade,
  ...sync,
});

const pedido = (id: string, diaId: string, status: Pedido["status"]): Pedido => ({
  id,
  cantinaId: CANTINA,
  diaId,
  clienteId: null,
  origem: "balcao",
  status,
  vendedorId: null,
  criadoEm: "2026-11-01T20:00:00.000Z",
  entregueEm: null,
  ...sync,
});

const item = (pedidoId: string, produtoId: string, quantidade: number, canceladoEm: string | null = null): ItemPedido => ({
  id: `${pedidoId}-${produtoId}-${quantidade}`,
  pedidoId,
  cantinaId: CANTINA,
  produtoId,
  quantidade,
  precoUnitarioCentavos: 1200,
  canceladoEm,
  ...sync,
});

describe("estoqueDoDia", () => {
  it("desconta vendas e reservas do dia, sem pedidos nem itens cancelados", () => {
    const estoque = estoqueDoDia(
      {
        precosDoDia: [preco(DIA, "espeto", 10)],
        pedidos: [
          pedido("venda", DIA, "entregue"),
          pedido("reserva", DIA, "recebido"),
          pedido("cancelado", DIA, "cancelado"),
          pedido("outro", OUTRO_DIA, "entregue"),
        ],
        itens: [
          item("venda", "espeto", 3),
          item("reserva", "espeto", 2),
          item("venda", "espeto", 4, "2026-11-01T21:00:00.000Z"),
          item("cancelado", "espeto", 5),
          item("outro", "espeto", 5),
        ],
      },
      DIA,
    );
    expect(estoque("espeto")).toEqual({ quantidade: 10, vendidos: 5, restantes: 5, esgotado: false });
  });

  it("sem quantidade no dia, não tem limite", () => {
    const estoque = estoqueDoDia(
      { precosDoDia: [preco(DIA, "espeto", null)], pedidos: [pedido("p", DIA, "entregue")], itens: [item("p", "espeto", 7)] },
      DIA,
    );
    expect(estoque("espeto")).toEqual({ quantidade: null, vendidos: 7, restantes: null, esgotado: false });
    expect(estoque("sem-linha")).toEqual({ quantidade: null, vendidos: 0, restantes: null, esgotado: false });
  });

  it("esgota em zero e não fica negativo se a quantidade baixar depois das vendas", () => {
    const dados = { pedidos: [pedido("p", DIA, "entregue")], itens: [item("p", "espeto", 4)] };
    expect(estoqueDoDia({ ...dados, precosDoDia: [preco(DIA, "espeto", 4)] }, DIA)("espeto")).toMatchObject({
      restantes: 0,
      esgotado: true,
    });
    expect(estoqueDoDia({ ...dados, precosDoDia: [preco(DIA, "espeto", 2)] }, DIA)("espeto")).toMatchObject({
      restantes: 0,
      esgotado: true,
    });
  });

  it("linha gravada antes da coluna existir (sem o campo) conta como sem limite", () => {
    const antiga = { ...preco(DIA, "espeto", null) } as Partial<PrecoDoDia>;
    delete antiga.quantidade;
    const estoque = estoqueDoDia({ precosDoDia: [antiga as PrecoDoDia], pedidos: [], itens: [] }, DIA);
    expect(estoque("espeto").quantidade).toBeNull();
  });
});
