import { createHash, timingSafeEqual } from "node:crypto";

export const HEADER_CODIGO_EQUIPE = "x-codigo-equipe";

function digest(valor: string): Buffer {
  return createHash("sha256").update(valor, "utf8").digest();
}

/**
 * Confere o código da equipe em tempo constante.
 * Os dois lados viram hashes SHA-256 de mesmo tamanho antes da comparação,
 * para que nem o conteúdo nem o tamanho do código vazem pelo tempo de resposta.
 * Sem código configurado no servidor, recusa tudo.
 */
export function codigoEquipeValido(
  recebido: string | null | undefined,
  esperado: string | undefined = process.env.CODIGO_ACESSO_EQUIPE,
): boolean {
  if (!esperado || !recebido) return false;
  return timingSafeEqual(digest(recebido), digest(esperado));
}

/** Devolve uma resposta 401 se o pedido não trouxer o código certo; senão, null. */
export function exigirCodigoEquipe(request: Request): Response | null {
  if (codigoEquipeValido(request.headers.get(HEADER_CODIGO_EQUIPE))) return null;
  return Response.json({ erro: "Código da equipe ausente ou incorreto." }, { status: 401 });
}
