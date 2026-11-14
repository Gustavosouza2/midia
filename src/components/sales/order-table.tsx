"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { paginate, type DayOrder } from "@/lib/sales";
import { OrderActions } from "./order-actions";
import { OrderAmount } from "./order-amount";

export function OrderTable({ orders }: { orders: DayOrder[] }) {
  const [page, setPage] = useState(1);
  const current = paginate(orders, page);
  const cellClass = "border-b border-border px-5 py-3 group-last:border-b-0";
  const headerClass = "border-b border-border bg-muted px-5 py-2.5 text-[11px] font-medium text-muted-foreground";

  return (
    <Card className="hidden tablet:flex">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${headerClass} text-left`}>Nome</th>
              <th className={`${headerClass} text-left`}>Item</th>
              <th className={`${headerClass} text-right`}>Valor</th>
              <th className={`${headerClass} text-left`}>Hora</th>
              <th className={`${headerClass} w-[220px] text-right`}>Status</th>
            </tr>
          </thead>
          <tbody>
            {current.items.map((p) => (
              <tr key={p.id} className="group animate-in duration-300 fade-in">
                <td className={`${cellClass} font-semibold`}>{p.name}</td>
                <td className={`${cellClass} text-text-2`}>{p.description}</td>
                <td className={`${cellClass} text-right whitespace-nowrap`}>
                  <OrderAmount order={p} />
                </td>
                <td className={`${cellClass} whitespace-nowrap text-muted-foreground`}>{p.time}</td>
                <td className={`${cellClass} py-2 text-right whitespace-nowrap`}>
                  <OrderActions order={p} placement="table" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {current.totalPages > 1 && (
        <nav
          aria-label="Páginas"
          className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border bg-muted px-5 py-2.5"
        >
          <span className="text-[11px] text-muted-foreground">{current.range}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={current.page === 1} onClick={() => setPage(current.page - 1)}>
              ‹ Anterior
            </Button>
            {Array.from({ length: current.totalPages }, (_, i) => i + 1).map((n) => (
              <Button
                key={n}
                variant={n === current.page ? "default" : "outline"}
                size="icon-sm"
                aria-label={`Página ${n}`}
                aria-current={n === current.page ? "page" : undefined}
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={current.page === current.totalPages}
              onClick={() => setPage(current.page + 1)}
            >
              Próxima ›
            </Button>
          </div>
        </nav>
      )}
    </Card>
  );
}
