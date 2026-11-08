import Dexie, { type EntityTable } from "dexie";
import type {
  cantinas,
  clientes,
  diasDeVenda,
  itensPedido,
  pagamentos,
  pedidos,
  produtos,
  vendedores,
} from "@/db/schema";

/**
 * Banco local (IndexedDB) do aparelho. No futuro, a interface lê e grava só aqui,
 * e a fila `outbox` leva as mudanças para a API. Por enquanto é só o schema:
 * a sincronização ainda não existe.
 *
 * Os registros espelham as linhas do servidor como chegam pela API (JSON),
 * por isso datas são strings ISO em vez de Date.
 */
type ComoJson<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K];
};

export type Cantina = ComoJson<typeof cantinas.$inferSelect>;
export type Vendedor = ComoJson<typeof vendedores.$inferSelect>;
export type Cliente = ComoJson<typeof clientes.$inferSelect>;
export type Produto = ComoJson<typeof produtos.$inferSelect>;
export type DiaDeVenda = ComoJson<typeof diasDeVenda.$inferSelect>;
export type Pedido = ComoJson<typeof pedidos.$inferSelect>;
export type ItemPedido = ComoJson<typeof itensPedido.$inferSelect>;
export type Pagamento = ComoJson<typeof pagamentos.$inferSelect>;

export type TabelaSincronizada =
  | "cantinas"
  | "vendedores"
  | "clientes"
  | "produtos"
  | "diasDeVenda"
  | "pedidos"
  | "itensPedido"
  | "pagamentos";

/** Uma mudança local esperando para ir ao servidor. Sem deletes: só inserir ou atualizar. */
export type ItemOutbox = {
  id: number;
  tabela: TabelaSincronizada;
  registroId: string;
  operacao: "inserir" | "atualizar";
  payload: Record<string, unknown>;
  criadoEm: string;
};

export class CantinaLocalDb extends Dexie {
  cantinas!: EntityTable<Cantina, "id">;
  vendedores!: EntityTable<Vendedor, "id">;
  clientes!: EntityTable<Cliente, "id">;
  produtos!: EntityTable<Produto, "id">;
  diasDeVenda!: EntityTable<DiaDeVenda, "id">;
  pedidos!: EntityTable<Pedido, "id">;
  itensPedido!: EntityTable<ItemPedido, "id">;
  pagamentos!: EntityTable<Pagamento, "id">;
  /** Fila de saída em ordem de chegada (id autoincremental). */
  outbox!: EntityTable<ItemOutbox, "id">;

  constructor() {
    super("cantina");
    // Só os campos usados em buscas viram índice. Nunca edite uma versão já publicada:
    // para mudar o schema, adicione this.version(2) com as mudanças.
    this.version(1).stores({
      cantinas: "id, slug, seq",
      vendedores: "id, cantinaId, seq",
      clientes: "id, cantinaId, nome, seq",
      produtos: "id, cantinaId, seq",
      diasDeVenda: "id, cantinaId, data, seq",
      pedidos: "id, cantinaId, diaId, clienteId, status, seq",
      itensPedido: "id, pedidoId, cantinaId, produtoId, seq",
      pagamentos: "id, pedidoId, cantinaId, seq",
      outbox: "++id, tabela, registroId, criadoEm",
    });
  }
}

let instancia: CantinaLocalDb | null = null;

/** Abre o banco local. Só funciona no navegador. */
export function getLocalDb(): CantinaLocalDb {
  if (typeof indexedDB === "undefined") {
    throw new Error("O banco local só está disponível no navegador.");
  }
  instancia ??= new CantinaLocalDb();
  return instancia;
}
