"use client";

import { Pencil, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { getLocalDb } from "@/local-db";
import { definirQuantidadeNoDia } from "@/local-db/escritas";
import { lerQuantidade, type ItemDoCardapio } from "@/lib/cardapio";

/** "50 · restam 32", "50 · Esgotado" ou "Sem limite", com o lápis para mudar. Vazio = sem limite. */
export function QuantidadeNoDia({
  diaId,
  item,
  tentar,
  aoErrar,
}: {
  diaId: string;
  item: ItemDoCardapio;
  tentar: (escrita: () => Promise<void>) => Promise<boolean>;
  aoErrar: (mensagem: string | null) => void;
}) {
  const { produto, estoque } = item;
  const [rascunho, setRascunho] = useState<string | null>(null);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const quantidade = lerQuantidade(rascunho ?? "");
    if (quantidade === undefined) return aoErrar("Quantidade inválida. Use um número inteiro, ou deixe vazio para sem limite.");
    if (quantidade === estoque.quantidade) return setRascunho(null);
    if (await tentar(() => definirQuantidadeNoDia(getLocalDb(), diaId, produto.id, quantidade))) setRascunho(null);
  }

  function cancelar() {
    setRascunho(null);
    aoErrar(null);
  }

  if (rascunho !== null) {
    return (
      <form onSubmit={salvar} className="flex items-center gap-2">
        <Input
          aria-label="Quantidade neste dia"
          autoFocus
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Sem limite"
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && cancelar()}
          className="flex-1 bg-background font-semibold wide:h-[30px] wide:w-24 wide:flex-none wide:rounded-[7px]"
        />
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
    );
  }

  return (
    <div className="flex items-center justify-between gap-2.5 wide:justify-start wide:gap-2">
      <div className="flex flex-col leading-tight wide:flex-row wide:items-center wide:gap-2">
        <span className="text-[11px] text-muted-foreground wide:hidden">Quantidade neste dia</span>
        {estoque.quantidade === null ? (
          <span className="text-sm text-text-2 wide:text-[13px]">Sem limite</span>
        ) : (
          <span className="flex items-center gap-1.5">
            <strong className="text-lg font-semibold wide:text-[13px]">{estoque.quantidade}</strong>
            {estoque.esgotado ? (
              <Badge variant="warn" className="h-auto rounded-md px-[7px] py-px font-normal">
                Esgotado
              </Badge>
            ) : (
              <span className="text-[11px] text-muted-foreground">· restam {estoque.restantes}</span>
            )}
          </span>
        )}
      </div>
      <Button
        variant="outline"
        aria-label={`Mudar a quantidade de ${produto.nome} neste dia`}
        onClick={() => setRascunho(estoque.quantidade === null ? "" : String(estoque.quantidade))}
        className="h-9 rounded-[9px] wide:size-7 wide:rounded-[7px] wide:px-0 wide:text-text-2"
      >
        <Pencil className="size-3.5 wide:size-[13px]" />
        <span className="wide:hidden">Mudar quantidade</span>
      </Button>
    </div>
  );
}
