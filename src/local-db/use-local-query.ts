import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import { getLocalDb, type CantinaLocalDb } from "./index";

/**
 * Lê o banco local e se atualiza sozinho quando as tabelas lidas mudam.
 * `consulta` precisa ser estável (declarada fora do componente).
 * Devolve undefined até a primeira leitura terminar.
 */
export function useLeituraLocal<T>(consulta: (db: CantinaLocalDb) => Promise<T>): T | undefined {
  const [valor, setValor] = useState<T>();

  useEffect(() => {
    const assinatura = liveQuery(() => consulta(getLocalDb())).subscribe({
      next: setValor,
      error: (erro) => console.error("Falha ao ler o banco local", erro),
    });
    return () => assinatura.unsubscribe();
  }, [consulta]);

  return valor;
}
