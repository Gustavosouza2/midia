import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { CANTEEN_SLUG } from "@/server/canteen";

export async function GET() {
  const { canteens } = schema;
  const [canteen] = await getDb()
    .select({
      id: canteens.id,
      name: canteens.name,
      slug: canteens.slug,
      updatedAt: canteens.updatedAt,
      seq: canteens.seq,
    })
    .from(canteens)
    .where(eq(canteens.slug, CANTEEN_SLUG));

  if (!canteen) {
    return Response.json({ error: `Canteen "${CANTEEN_SLUG}" not found.` }, { status: 404 });
  }
  return Response.json({ canteen });
}
