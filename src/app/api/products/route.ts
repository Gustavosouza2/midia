import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { CANTEEN_SLUG } from "@/server/canteen";

export async function GET() {
  const { canteens, products } = schema;
  const list = await getDb()
    .select({
      id: products.id,
      name: products.name,
      priceCents: products.priceCents,
      active: products.active,
      updatedAt: products.updatedAt,
      seq: products.seq,
    })
    .from(products)
    .innerJoin(canteens, eq(canteens.id, products.canteenId))
    .where(eq(canteens.slug, CANTEEN_SLUG))
    .orderBy(asc(products.name));

  return Response.json({ products: list });
}
