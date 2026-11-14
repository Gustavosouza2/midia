import { plural } from "@/lib/format";
import { DIAS_PENDENTE_ANTIGO } from "@/lib/dashboard";

export function Idade({ dias }: { dias: number }) {
  return (
    <span className={`text-[11px] ${dias >= DIAS_PENDENTE_ANTIGO ? "text-warn" : "text-muted-foreground"}`}>
      {dias === 0 ? "hoje" : `há ${plural(dias, "dia", "dias")}`}
    </span>
  );
}
