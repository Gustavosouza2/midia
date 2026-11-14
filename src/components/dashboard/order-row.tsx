import type { ReactNode } from "react";
import { formatarBRL, iniciais } from "@/lib/format";
import type { ResumoPedido } from "@/lib/dashboard";

export function LinhaDePedido({
  pedido,
  meta,
  valor,
  detalhe,
  avatar,
}: {
  pedido: ResumoPedido;
  meta: string;
  valor: number;
  /** Linha pequena abaixo do valor. */
  detalhe: ReactNode;
  /** Classes do quadrado com as iniciais. */
  avatar: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-t border-border px-3.5 py-3 animate-in duration-300 fade-in slide-in-from-top-1 tablet:gap-3 tablet:px-5">
      <span
        className={`flex size-8 flex-none items-center justify-center rounded-lg text-[11px] font-semibold ${avatar}`}
      >
        {iniciais(pedido.nome)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-[1.3]">
        <strong className="truncate font-semibold">{pedido.nome}</strong>
        <span className="truncate text-[11px] text-muted-foreground">{meta}</span>
      </div>
      <div className="flex flex-col items-end leading-[1.3]">
        <strong className="font-semibold">{formatarBRL(valor)}</strong>
        {detalhe}
      </div>
    </div>
  );
}
