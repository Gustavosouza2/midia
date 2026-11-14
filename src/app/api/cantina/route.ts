import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { CANTINA_SLUG } from "@/server/cantina";

export async function GET() {
  const { cantinas } = schema;
  const [cantina] = await getDb()
    .select({
      id: cantinas.id,
      nome: cantinas.nome,
      slug: cantinas.slug,
      atualizadoEm: cantinas.atualizadoEm,
      seq: cantinas.seq,
    })
    .from(cantinas)
    .where(eq(cantinas.slug, CANTINA_SLUG));

  if (!cantina) {
    return Response.json({ erro: `Cantina "${CANTINA_SLUG}" não encontrada.` }, { status: 404 });
  }
  return Response.json({ cantina });
}
