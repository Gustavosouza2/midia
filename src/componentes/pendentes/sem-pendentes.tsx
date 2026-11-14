import type { ReactNode } from "react";
import { Card } from "@/componentes/ui/card";

export function SemPendentes({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card className="items-center gap-1.5 px-4 py-7 text-center tablet:px-5 tablet:py-10">
      <strong className="font-semibold">{titulo}</strong>
      {children}
    </Card>
  );
}
