import { montarPainel } from "@/lib/dashboard";
import type { CantinaLocalDb } from "./index";
import { lerBancoLocal } from "./read-local-db";

/** Contador do menu: pedidos com valor em aberto, de todos os dias. */
export async function contarPendentes(db: CantinaLocalDb): Promise<number> {
  const dados = await lerBancoLocal(db);
  return montarPainel(dados, "todos", dados.hoje).pendentes.length;
}
