import { Badge } from "@/components/ui/badge";
import type { DiaDeVenda } from "@/local-db";
import { rotuloComSemana } from "@/lib/format";

/** "Dom, 15 nov", o selo "hoje" ou "próximo" e o nome do dia cortado: no gatilho e na lista de dias. */
export function RotuloDoDia({ dia, marca }: { dia: DiaDeVenda; marca: "hoje" | "próximo" | null }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="flex-none font-medium text-foreground tabular-nums">{rotuloComSemana(dia.data)}</span>
      {marca && (
        <Badge variant={marca === "hoje" ? "ok" : "secondary"} className="h-[18px] px-1.5 text-[10px]">
          {marca}
        </Badge>
      )}
      {dia.nome && <span className="truncate text-muted-foreground">{dia.nome}</span>}
    </span>
  );
}
