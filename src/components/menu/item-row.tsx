"use client";

import { Pencil, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getLocalDb } from "@/local-db";
import { definirNoCardapio, definirPrecoNoDia, ErroDeEscrita } from "@/local-db/writes";
import { lerReais, reaisParaCampo, type ItemDoCardapio } from "@/lib/menu";
import { formatarBRL, iniciais, plural } from "@/lib/format";
import { CampoDeReais } from "./currency-field";
import { COLUNAS } from "./columns";
import { QuantidadeNoDia } from "./day-quantity";

/**
 * Um item do cardápio do dia. Até 1180px: cartão com o switch no topo e o preço e a quantidade
 * embaixo (só quando está à venda). Acima: linha da tabela.
 */
export function LinhaDoItem({ diaId, item }: { diaId: string; item: ItemDoCardapio }) {
  const { produto, aVenda } = item;
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function tentar(escrita: () => Promise<void>) {
    setErro(null);
    try {
      await escrita();
      return true;
    } catch (e) {
      setErro(e instanceof ErroDeEscrita ? e.message : "Não foi possível salvar.");
      return false;
    }
  }

  async function salvarPreco(evento: FormEvent) {
    evento.preventDefault();
    const precoCentavos = lerReais(rascunho ?? "");
    if (precoCentavos === null) return setErro("Preço inválido. Use reais, como 12 ou 12,50.");
    if (precoCentavos === item.precoCentavos) return setRascunho(null);
    if (await tentar(() => definirPrecoNoDia(getLocalDb(), diaId, produto.id, precoCentavos))) setRascunho(null);
  }

  function cancelar() {
    setRascunho(null);
    setErro(null);
  }

  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 rounded-xl border border-border bg-card p-3.5 wide:gap-x-4 wide:gap-y-1 wide:rounded-none wide:border-x-0 wide:border-b-0 wide:px-5 wide:py-3.5 ${COLUNAS} ${aVenda ? "" : "opacity-65 wide:opacity-60"}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-[38px] flex-none items-center justify-center rounded-[9px] border border-border bg-muted text-xs font-semibold wide:size-[34px] wide:rounded-lg wide:text-[11px]">
          {iniciais(produto.nome)}
        </span>
        <div className="flex min-w-0 flex-col leading-[1.3]">
          <strong className="truncate font-semibold">{produto.nome}</strong>
          <span className="text-[11px] text-muted-foreground">
            <span className="wide:hidden">
              {plural(item.estoque.vendidos, "vendido", "vendidos")} · padrão {formatarBRL(produto.precoCentavos)}
            </span>
            <span className="hidden wide:inline">Preço padrão {formatarBRL(produto.precoCentavos)}</span>
          </span>
        </div>
      </div>

      <div
        className={`col-span-2 flex-col gap-1 border-t border-border pt-3 wide:col-span-1 wide:flex wide:border-t-0 wide:pt-0 ${aVenda ? "flex" : "hidden"}`}
      >
        {rascunho === null ? (
          <div className="flex items-center justify-between gap-2.5 wide:justify-start wide:gap-2">
            <div className="flex flex-col leading-tight wide:flex-row wide:items-center wide:gap-2">
              <span className="text-[11px] text-muted-foreground wide:hidden">Preço neste dia</span>
              <strong className="text-lg font-semibold wide:min-w-16 wide:text-[13px]">
                {formatarBRL(item.precoCentavos)}
              </strong>
              {item.diferenteDoPadrao && (
                <Badge variant="ok" className="h-auto rounded-md px-[7px] py-px font-normal">
                  diferente do padrão
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              aria-label={`Mudar o preço de ${produto.nome} neste dia`}
              onClick={() => setRascunho(reaisParaCampo(item.precoCentavos))}
              className="h-9 rounded-[9px] wide:size-7 wide:rounded-[7px] wide:px-0 wide:text-text-2"
            >
              <Pencil className="size-3.5 wide:size-[13px]" />
              <span className="wide:hidden">Mudar preço</span>
            </Button>
          </div>
        ) : (
          <form onSubmit={salvarPreco} className="flex items-center gap-2">
            <div className="flex-1 wide:w-24 wide:flex-none">
              <CampoDeReais
                aria-label="Novo preço"
                autoFocus
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && cancelar()}
                className="font-semibold wide:h-[30px] wide:rounded-[7px] wide:pl-7"
              />
            </div>
            <Button
              type="submit"
              className="h-[42px] rounded-[10px] px-3.5 text-[13px] wide:h-[30px] wide:rounded-[7px] wide:px-2.5 wide:text-xs"
            >
              Salvar
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-label="Cancelar"
              onClick={cancelar}
              className="size-[42px] px-0 text-muted-foreground wide:h-[30px] wide:w-[26px]"
            >
              <X className="size-4" />
            </Button>
          </form>
        )}
      </div>

      <div className={`col-span-2 wide:col-span-1 wide:block ${aVenda ? "block" : "hidden"}`}>
        <QuantidadeNoDia diaId={diaId} item={item} tentar={tentar} aoErrar={setErro} />
      </div>

      <span className="hidden text-text-2 wide:block">{plural(item.estoque.vendidos, "vendido", "vendidos")}</span>

      <label className="col-start-2 row-start-1 flex items-center gap-2 p-1 text-xs text-text-2 wide:col-start-auto wide:row-start-auto wide:p-0">
        <Switch
          checked={aVenda}
          onCheckedChange={(sim) => void tentar(() => definirNoCardapio(getLocalDb(), diaId, produto.id, sim))}
          aria-label={aVenda ? `Tirar ${produto.nome} do cardápio deste dia` : `Colocar ${produto.nome} no cardápio deste dia`}
        />
        <span className="hidden wide:inline">{aVenda ? "À venda" : "Fora"}</span>
      </label>

      {erro && (
        <p role="alert" className="col-span-2 text-[11px] text-warn wide:col-start-2">
          {erro}
        </p>
      )}
    </li>
  );
}
