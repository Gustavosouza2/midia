import type { Cantina, CantinaLocalDb } from "./index";

/**
 * Traz a cantina do servidor para o aparelho. As escritas locais precisam dela (cantina_id).
 * É dado do servidor, então não passa pela outbox. Sem rede ou sem resposta válida, não faz nada.
 */
export async function baixarCantina(db: CantinaLocalDb): Promise<void> {
  try {
    const resposta = await fetch("/api/cantina");
    if (!resposta.ok) return;
    const { cantina } = (await resposta.json()) as { cantina?: Cantina };
    if (typeof cantina?.id !== "string") return;
    await db.cantinas.put(cantina);
  } catch {
    // Offline ou servidor fora do ar: tenta de novo na próxima abertura do app.
  }
}
