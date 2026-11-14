import { diaPorExtenso, formatarBRL, plural, rotuloDia } from "@/lib/format";
import type { ResumoDia } from "@/lib/dashboard";
import { listrado } from "./striped";

export function LinhaDoDia({
  resumo,
  escala,
  selecionado,
  apagado,
  aoClicar,
}: {
  resumo: ResumoDia;
  /** Valor que ocupa a barra inteira (o maior vendido da lista). */
  escala: number;
  selecionado: boolean;
  apagado: boolean;
  aoClicar: () => void;
}) {
  const { dia, vendido, recebido } = resumo;
  // Dia que ainda não vendeu nada, só tem reservas.
  const soReservas = resumo.proximo && resumo.vendas === 0;
  const meta = soReservas
    ? `próximo · ${plural(resumo.reservas, "reserva", "reservas")}`
    : `${plural(resumo.itens, "item", "itens")} · ${plural(resumo.vendas, "venda", "vendas")}`;

  return (
    <button
      type="button"
      aria-pressed={selecionado}
      aria-label={`${diaPorExtenso(dia.data)}: ${formatarBRL(vendido)} vendidos, ${formatarBRL(recebido)} recebidos. Filtrar por este dia`}
      onClick={aoClicar}
      className={`flex w-full flex-col gap-1.5 border-t border-border px-3.5 py-3 text-left transition-[opacity,background-color] duration-300 ease-out hover:bg-muted tablet:grid tablet:grid-cols-[140px_minmax(0,1fr)_92px] tablet:items-center tablet:gap-3.5 tablet:px-5 ${apagado ? "opacity-40" : ""}`}
    >
      <span className="flex justify-between gap-2 leading-[1.3] tablet:flex-col tablet:justify-start tablet:gap-0">
        <strong className="font-semibold">{rotuloDia(dia.data)}</strong>
        <span className="font-semibold tablet:hidden">{formatarBRL(vendido)}</span>
        <span className="hidden text-[11px] text-muted-foreground tablet:block">{meta}</span>
      </span>
      <span aria-hidden="true" className="flex h-2.5 w-full gap-0.5 tablet:h-3.5">
        <span
          className="block rounded-[3px] bg-ok-fill transition-[width] duration-500 ease-out"
          style={{ width: `${(recebido / escala) * 100}%` }}
        />
        <span
          className="block rounded-[3px] transition-[width] duration-500 ease-out"
          style={{ ...listrado, width: `${((vendido - recebido) / escala) * 100}%` }}
        />
      </span>
      <span className="text-[11px] text-muted-foreground tablet:hidden">{meta}</span>
      <span className="hidden flex-col text-right leading-[1.3] tablet:flex">
        <strong className="font-semibold">{formatarBRL(vendido)}</strong>
        <span className="text-[11px] text-muted-foreground">
          {soReservas ? "só reservas" : `${resumo.pctRecebido}% recebido`}
        </span>
      </span>
    </button>
  );
}
