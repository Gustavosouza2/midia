import type { ReactNode } from "react";
import { Card } from "@/componentes/ui/card";

/**
 * Card dividido em 4 colunas (2×2 abaixo do breakpoint `wide`). As divisórias são o fundo
 * `border` aparecendo pelo `gap-px`, então valem para qualquer arranjo de colunas.
 */
export function FaixaDeNumeros({ children }: { children: ReactNode }) {
  return (
    <Card className="grid grid-cols-2 gap-px bg-border wide:grid-cols-4">{children}</Card>
  );
}
