import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { CANTINA_SLUG } from "@/server/cantina";
import { exigirCodigoEquipe } from "@/server/codigo-acesso";

export async function GET(request: Request) {
  const negado = exigirCodigoEquipe(request);
  if (negado) return negado;

  const { cantinas, produtos } = schema;
  const lista = await getDb()
    .select({
      id: produtos.id,
      nome: produtos.nome,
      precoCentavos: produtos.precoCentavos,
      ativo: produtos.ativo,
      atualizadoEm: produtos.atualizadoEm,
      seq: produtos.seq,
    })
    .from(produtos)
    .innerJoin(cantinas, eq(cantinas.id, produtos.cantinaId))
    .where(eq(cantinas.slug, CANTINA_SLUG))
    .orderBy(asc(produtos.nome));

  return Response.json({ produtos: lista });
}
