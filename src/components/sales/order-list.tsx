"use client";

import { Card } from "@/components/ui/card";
import type { DayOrder } from "@/lib/sales";
import { OrderCards } from "./order-cards";
import { OrderTable } from "./order-table";

/** Tablet and desktop: table paginated 6 at a time. Phone: cards with "Carregar mais". */
export function OrderList({ orders, emptyMessage }: { orders: DayOrder[]; emptyMessage: string }) {
  if (orders.length === 0) {
    return <Card className="px-5 py-7 text-center text-xs text-muted-foreground">{emptyMessage}</Card>;
  }
  return (
    <>
      <OrderTable orders={orders} />
      <OrderCards orders={orders} />
    </>
  );
}
