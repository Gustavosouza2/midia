/**
 * UUID v5 (RFC 9562): id determinístico a partir de um namespace e um nome, com SHA-1.
 * Usa crypto.subtle, que existe no navegador e no Node 22. É assíncrono: dentro de uma
 * transação do Dexie, calcule o id antes de abrir a transação.
 */
export async function uuidV5(nome: string, namespace: string): Promise<string> {
  const ns = namespace.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(ns)) throw new Error(`Namespace inválido: ${namespace}`);

  const nsBytes = Uint8Array.from(ns.match(/../g)!, (par) => parseInt(par, 16));
  const nomeBytes = new TextEncoder().encode(nome);
  const entrada = new Uint8Array(nsBytes.length + nomeBytes.length);
  entrada.set(nsBytes);
  entrada.set(nomeBytes, nsBytes.length);

  const hash = new Uint8Array(await crypto.subtle.digest("SHA-1", entrada)).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
