"use client";

import { cn } from "cn";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getLocalDb } from "@/local-db";
import { ErroDeEscrita, estornarPagamento, registrarPagamento } from "@/local-db/writes";
import { formatarBRL, iniciais, plural } from "@/lib/format";
import { DIAS_PENDENTE_ANTIGO } from "@/lib/dashboard";
import type { FormaPagamento, LinhaPendente as Linha } from "@/lib/pending";

/** Celular: botões de 38px que dividem a largura. Tablet e desktop: 30px, do tamanho do texto. */
const BOTAO = "h-[38px] flex-1 rounded-[9px] text-[13px] tablet:h-[30px] tablet:flex-none tablet:rounded-[7px] tablet:text-xs";
const PAGO_COM: Record<FormaPagamento, string> = { pix: "Pago via Pix", dinheiro: "Pago em dinheiro" };

/**
 * Uma linha por pedido em aberto. Celular: cartão com os botões embaixo. Tablet: o mesmo, com
 * as ações numa linha inteira. Desktop: colunas pessoa · idade · valor · ações.
 */
export function LinhaPendente({
  linha,
  escolhendo,
  aoAbrir,
  aoFechar,
  aoReceber,
}: {
  linha: Linha;
  escolhendo: boolean;
  aoAbrir: () => void;
  aoFechar: () => void;
  aoReceber: (pagamentoId: string) => void;
}) {
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { situacao } = linha;
  const pago = situacao.tipo === "pago";
  const antigo = linha.idadeDias >= DIAS_PENDENTE_ANTIGO;
  const idade = linha.idadeDias === 0 ? "hoje" : `há ${plural(linha.idadeDias, "dia", "dias")}`;

  async function gravar<T>(escrita: () => Promise<T>, depois: (resultado: T) => void) {
    setGravando(true);
    setErro(null);
    try {
      depois(await escrita());
    } catch (e) {
      setErro(e instanceof ErroDeEscrita ? e.message : "Não foi possível gravar no aparelho.");
    } finally {
      setGravando(false);
    }
  }

  const receber = (forma: FormaPagamento) =>
    gravar(() => registrarPagamento(getLocalDb(), linha.pedidoId, forma), aoReceber);

  return (
    <div
      role="group"
      aria-label={linha.nome}
      className="flex flex-col gap-2.5 border-t border-border px-3.5 py-3 animate-in duration-300 fade-in slide-in-from-top-1 tablet:grid tablet:grid-cols-[minmax(0,1fr)_auto] tablet:items-center tablet:gap-x-4 tablet:px-5 desk:grid-cols-[minmax(0,1fr)_110px_80px_210px]"
    >
      <div className="flex items-center gap-2.5 tablet:contents">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 tablet:gap-3">
          <span className="flex size-[34px] flex-none items-center justify-center rounded-[9px] border border-border bg-muted text-[11px] font-semibold tablet:size-8 tablet:rounded-lg">
            {iniciais(linha.nome)}
          </span>
          <div className="flex min-w-0 flex-col leading-[1.3]">
            <strong className={cn("truncate font-semibold", pago && "text-muted-foreground line-through")}>
              {linha.nome}
            </strong>
            <span className="truncate text-[11px] text-muted-foreground">{linha.descricao}</span>
          </div>
        </div>

        <span className="hidden desk:block">
          <span
            className={cn(
              "rounded-md px-[7px] py-0.5 text-[11px]",
              pago ? "bg-accent text-muted-foreground" : antigo ? "bg-warn-soft text-warn" : "bg-accent text-text-2",
            )}
          >
            {idade}
          </span>
        </span>

        <div className="flex flex-col items-end leading-[1.3]">
          <strong className="font-semibold">{formatarBRL(linha.valor)}</strong>
          <span
            className={cn(
              "text-[11px] desk:hidden",
              pago ? "text-foreground" : antigo ? "text-warn" : "text-muted-foreground",
            )}
          >
            {pago ? "pago" : idade}
          </span>
        </div>
      </div>

      <div
        key={`${situacao.tipo}-${escolhendo}`}
        className="flex gap-2 animate-in duration-200 fade-in zoom-in-95 tablet:col-span-full tablet:gap-1.5 desk:col-span-1 desk:justify-end"
      >
        {situacao.tipo === "pago" ? (
          <>
            <span
              key="pago"
              role="status"
              className={cn(BOTAO, "inline-flex items-center justify-center bg-ok-soft text-ok tablet:px-2.5")}
            >
              {PAGO_COM[situacao.forma]}
            </span>
            <Button
              variant="outline"
              disabled={gravando}
              onClick={() => gravar(() => estornarPagamento(getLocalDb(), situacao.pagamentoId), () => {})}
              className="h-[38px] rounded-[9px] px-3 text-text-2 tablet:h-[30px] tablet:rounded-[7px] tablet:border-0 tablet:bg-transparent tablet:px-2.5 tablet:text-muted-foreground tablet:underline tablet:underline-offset-3"
            >
              Desfazer
            </Button>
          </>
        ) : escolhendo ? (
          <>
            <Button key="pix" autoFocus disabled={gravando} onClick={() => receber("pix")} className={BOTAO}>
              Pix
            </Button>
            <Button
              disabled={gravando}
              onClick={() => receber("dinheiro")}
              className={cn(
                BOTAO,
                "tablet:border tablet:border-input tablet:bg-background tablet:text-foreground tablet:hover:bg-accent",
              )}
            >
              Dinheiro
            </Button>
            <Button
              variant="outline"
              aria-label="Cancelar"
              disabled={gravando}
              onClick={aoFechar}
              className="size-[38px] rounded-[9px] p-0 text-muted-foreground tablet:size-[30px] tablet:rounded-[7px] tablet:border-0 tablet:bg-transparent"
            >
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <Button
            key="receber"
            variant="outline"
            aria-label={`Receber ${formatarBRL(linha.valor)} de ${linha.nome}`}
            onClick={aoAbrir}
            className={cn(
              BOTAO,
              "tablet:border-0 tablet:bg-primary tablet:px-3 tablet:text-primary-foreground tablet:hover:bg-primary/90",
            )}
          >
            Receber
          </Button>
        )}
      </div>

      {erro && (
        <p role="alert" className="text-[11px] text-warn tablet:col-span-full desk:text-right">
          {erro}
        </p>
      )}
    </div>
  );
}
