import { hojeLocal } from "@/lib/format";
import type { CantinaLocalDb } from "./index";

/**
 * Tudo o que as telas leem do banco local, mais a data de hoje. O aparelho só guarda os dados
 * da própria cantina, então a leitura não filtra por cantina_id.
 */
export async function lerBancoLocal(db: CantinaLocalDb) {
  const [dias, pedidos, itens, pagamentos, produtos, clientes, precosDoDia] = await Promise.all([
    db.diasDeVenda.toArray(),
    db.pedidos.toArray(),
    db.itensPedido.toArray(),
    db.pagamentos.toArray(),
    db.produtos.toArray(),
    db.clientes.toArray(),
    db.precosDoDia.toArray(),
  ]);
  return { dias, pedidos, itens, pagamentos, produtos, clientes, precosDoDia, hoje: hojeLocal() };
}

export type BancoLocal = Awaited<ReturnType<typeof lerBancoLocal>>;
