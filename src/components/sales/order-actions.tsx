"use client";

import { cn } from "cn";
import { X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLocalDb, type CantinaLocalDb } from "@/local-db";
import {
  entregarReserva,
  ErroDeEscrita,
  estornarPagamento,
  registrarPagamento,
  type FormaPagamento,
} from "@/local-db/writes";
import { rotuloPago, type PedidoDoDia } from "@/lib/sales";

/**
 * Status e ações de um pedido (padrão de Pendentes):
 * - pendente: "Pendente" ou "Marcar pago" abre Pix · Dinheiro · × no lugar;
 * - pago: "Pago · Pix"; na tabela, tocar oferece "Desfazer"; no cartão e no quadro, "Desfazer" direto;
 * - reservado: "Reservado" e "Entregar" (o pagamento continua como estava).
 * `onde` muda só a forma: selos clicáveis na tabela, selo + botão no cartão, só o botão no quadro.
 */
export function AcoesDoPedido({ pedido, onde }: { pedido: PedidoDoDia; onde: "tabela" | "cartao" | "quadro" }) {
  const [modo, setModo] = useState<"normal" | "receber" | "desfazer">("normal");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function executar(acao: (db: CantinaLocalDb) => Promise<unknown>) {
    setSalvando(true);
    setErro(null);
    try {
      await acao(getLocalDb());
      setModo("normal");
    } catch (e) {
      setErro(e instanceof ErroDeEscrita ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const receber = (forma: FormaPagamento) => executar((db) => registrarPagamento(db, pedido.id, forma));
  const desfazer = () =>
    executar(async (db) => {
      for (const id of pedido.pagamentosAtivos) await estornarPagamento(db, id);
    });
  const entregar = () => executar((db) => entregarReserva(db, pedido.id));

  const tabela = onde === "tabela";
  const botao = tabela ? "h-[26px] rounded-md px-2.5 text-[11px]" : "h-[30px] px-3";
  const selo = tabela ? "h-[26px] rounded-md px-2.5" : "h-[30px] rounded-lg px-2.5 text-xs";
  const fechar = (
    <Button
      variant="ghost"
      aria-label="Cancelar"
      disabled={salvando}
      onClick={() => setModo("normal")}
      className={cn(botao, "px-1.5")}
    >
      <X className="size-3.5" />
    </Button>
  );

  let conteudo;
  if (pedido.status === "reservado") {
    conteudo = (
      <>
        {onde !== "quadro" && (
          <Badge variant="outline" className={cn(selo, "border-input bg-muted")}>
            Reservado
          </Badge>
        )}
        <Button variant={onde === "quadro" ? "outline" : "default"} disabled={salvando} onClick={entregar} className={botao}>
          Entregar
        </Button>
      </>
    );
  } else if (modo === "receber") {
    conteudo = (
      <>
        {(["pix", "dinheiro"] as const).map((forma) => (
          <Button key={forma} disabled={salvando} onClick={() => receber(forma)} className={botao}>
            {forma === "pix" ? "Pix" : "Dinheiro"}
          </Button>
        ))}
        {fechar}
      </>
    );
  } else if (modo === "desfazer") {
    conteudo = (
      <>
        <Badge variant="ok" className={selo}>
          {rotuloPago(pedido.formas)}
        </Badge>
        <Button variant="outline" disabled={salvando} onClick={desfazer} className={botao}>
          Desfazer
        </Button>
        {fechar}
      </>
    );
  } else if (pedido.status === "pendente") {
    conteudo = tabela ? (
      <Badge asChild variant="warn" className={cn(selo, "cursor-pointer hover:brightness-95")}>
        <button type="button" aria-label="Pendente. Tocar para marcar como pago" onClick={() => setModo("receber")}>
          Pendente
        </button>
      </Badge>
    ) : (
      <>
        {onde === "cartao" && (
          <Badge variant="warn" className={selo}>
            Pendente
          </Badge>
        )}
        <Button
          variant={onde === "quadro" ? "outline" : "default"}
          onClick={() => setModo("receber")}
          className={botao}
        >
          Marcar pago
        </Button>
      </>
    );
  } else {
    conteudo = tabela ? (
      <Badge asChild variant="ok" className={cn(selo, "cursor-pointer hover:brightness-95")}>
        <button
          type="button"
          aria-label={`${rotuloPago(pedido.formas)}. Tocar para desfazer`}
          onClick={() => setModo("desfazer")}
        >
          {rotuloPago(pedido.formas)}
        </button>
      </Badge>
    ) : (
      <>
        {onde === "cartao" && (
          <Badge variant="ok" className={selo}>
            {rotuloPago(pedido.formas)}
          </Badge>
        )}
        <Button variant="outline" disabled={salvando} onClick={desfazer} className={botao}>
          Desfazer
        </Button>
      </>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        key={`${pedido.status}-${modo}`}
        role="group"
        aria-label={`Status de ${pedido.nome}`}
        className="flex flex-wrap items-center justify-end gap-1.5 animate-in duration-200 fade-in zoom-in-95"
      >
        {conteudo}
      </div>
      {erro && (
        <p role="alert" className="text-[11px] text-warn">
          {erro}
        </p>
      )}
    </div>
  );
}
