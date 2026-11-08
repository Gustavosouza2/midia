// Guarda o código da equipe no aparelho e o envia nas chamadas à API.
const CHAVE = "cantina:codigo-equipe";
export const HEADER_CODIGO_EQUIPE = "x-codigo-equipe";

export function lerCodigoEquipe(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function salvarCodigoEquipe(codigo: string): void {
  localStorage.setItem(CHAVE, codigo);
}

export function apagarCodigoEquipe(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // sem armazenamento disponível: nada a apagar
  }
}

/** fetch para a API do app, já com o header do código da equipe. */
export function fetchApi(caminho: string, init: RequestInit = {}, codigo = lerCodigoEquipe()) {
  const headers = new Headers(init.headers);
  if (codigo) headers.set(HEADER_CODIGO_EQUIPE, codigo);
  return fetch(caminho, { ...init, headers });
}
