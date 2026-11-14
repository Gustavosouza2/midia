/**
 * UUID v5 (RFC 9562): deterministic id from a namespace and a name, with SHA-1.
 * Uses crypto.subtle, which exists in the browser and in Node 22. It is async: inside a
 * Dexie transaction, compute the id before opening the transaction.
 */
export async function uuidV5(name: string, namespace: string): Promise<string> {
  const ns = namespace.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(ns)) throw new Error(`Invalid namespace: ${namespace}`);

  const nsBytes = Uint8Array.from(ns.match(/../g)!, (pair) => parseInt(pair, 16));
  const nameBytes = new TextEncoder().encode(name);
  const input = new Uint8Array(nsBytes.length + nameBytes.length);
  input.set(nsBytes);
  input.set(nameBytes, nsBytes.length);

  const hash = new Uint8Array(await crypto.subtle.digest("SHA-1", input)).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
