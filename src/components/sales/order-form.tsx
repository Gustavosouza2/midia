"use client";

import { cn } from "cn";
import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getLocalDb } from "@/local-db";
import { ErroDeEscrita, registrarPedido, type NovoPedido } from "@/local-db/writes";
import { formatarBRL } from "@/lib/format";
import { lerPreco, textoDoPreco, type ItemDoCardapio } from "@/lib/sales";
import { Campo } from "./field";

const QTD_MAXIMA = 99;

/**
 * Nova venda ou reserva de um item. `linha`: o card de uma linha do desktop; `folha`: os campos
 * empilhados da folha do celular. Depois de registrar, limpa Quem e Qtd e mantém o item.
 */
export function FormularioDePedido({
  diaId,
  cardapio,
  layout,
  aoRegistrar,
}: {
  diaId: string;
  cardapio: ItemDoCardapio[];
  layout: "linha" | "folha";
  aoRegistrar?: () => void;
}) {
  const id = useId();
  const nomeRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<NovoPedido["tipo"]>("venda");
  const [nome, setNome] = useState("");
  const [produtoId, setProdutoId] = useState<string | null>(null);
  const [qtd, setQtd] = useState(1);
  /** null = o preço do cardápio do dia. */
  const [precoTexto, setPrecoTexto] = useState<string | null>(null);
  const [pagamento, setPagamento] = useState<NovoPedido["pagamento"]>("pendente");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const linha = layout === "linha";
  const item =
    cardapio.find((i) => i.produtoId === produtoId) ?? cardapio.find((i) => i.restantes !== 0) ?? cardapio[0];

  if (!item) {
    return (
      <Card className={cn("px-4 py-5 text-xs text-muted-foreground", !linha && "border-0 px-0 py-2")}>
        <p>
          Nenhum item à venda neste dia.{" "}
          <Link transitionTypes={["tela"]} href="/cardapio" className="font-semibold text-foreground underline underline-offset-[3px]">
            Monte o cardápio do dia
          </Link>{" "}
          para registrar vendas.
        </p>
      </Card>
    );
  }

  // Qtd vai até o que resta do item no dia; trocar de item não estoura o limite do novo.
  const maximo = Math.max(1, Math.min(QTD_MAXIMA, item.restantes ?? QTD_MAXIMA));
  const quantidade = Math.min(qtd, maximo);
  const texto = precoTexto ?? textoDoPreco(item.precoCentavos);
  const preco = lerPreco(texto);
  const total = preco === null ? null : preco * quantidade;
  const reserva = tipo === "reserva";
  const rotuloBotao = `${reserva ? "Reservar" : "Registrar"} · ${total === null ? "—" : formatarBRL(total)}`;

  async function registrar(evento: FormEvent) {
    evento.preventDefault();
    if (preco === null) return setErro("Preço inválido.");
    if (!nome.trim() && (reserva || pagamento === "pendente")) {
      nomeRef.current?.focus();
      return setErro(reserva ? "Diga quem reservou." : "Diga quem vai pagar depois.");
    }
    setSalvando(true);
    setErro(null);
    try {
      await registrarPedido(getLocalDb(), {
        diaId,
        nomeCliente: nome,
        tipo,
        produtoId: item.produtoId,
        quantidade,
        precoUnitarioCentavos: preco,
        pagamento,
      });
      setNome("");
      setQtd(1);
      setPrecoTexto(null);
      setPagamento("pendente");
      nomeRef.current?.focus();
      aoRegistrar?.();
    } catch (e) {
      setErro(e instanceof ErroDeEscrita ? e.message : "Não foi possível registrar.");
    } finally {
      setSalvando(false);
    }
  }

  const campo =
    "flex h-[42px] min-w-0 items-center rounded-[10px] border border-input bg-muted tablet:h-[38px] tablet:rounded-lg";
  const segmento = "h-[34px] tablet:h-[30px]";

  const campos = (
    <>
      <Campo rotulo="Tipo" id={`${id}-tipo`}>
        <ToggleGroup
          type="single"
          aria-labelledby={`${id}-tipo`}
          value={tipo}
          onValueChange={(v) => v && setTipo(v as typeof tipo)}
        >
          <ToggleGroupItem value="venda" className={segmento}>
            Venda
          </ToggleGroupItem>
          <ToggleGroupItem value="reserva" className={segmento}>
            Reserva
          </ToggleGroupItem>
        </ToggleGroup>
      </Campo>

      <div className={cn("flex min-w-0 flex-col gap-1", linha && "flex-[1_1_140px]")}>
        <Label htmlFor={`${id}-nome`}>Quem</Label>
        <Input
          ref={nomeRef}
          id={`${id}-nome`}
          autoComplete="off"
          placeholder="Nome da pessoa"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="tablet:h-[38px]"
        />
      </div>

      <div className={cn("flex min-w-0 flex-col gap-1", linha && "flex-[1_1_150px]")}>
        <Label htmlFor={`${id}-item`}>Item</Label>
        <select
          id={`${id}-item`}
          value={item.produtoId}
          onChange={(e) => {
            setProdutoId(e.target.value);
            setPrecoTexto(null);
          }}
          className={cn(
            campo,
            "px-2.5 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring tablet:text-xs",
          )}
        >
          {cardapio.map((i) => (
            <option key={i.produtoId} value={i.produtoId} disabled={i.restantes === 0}>
              {i.nome} · {formatarBRL(i.precoCentavos)}
              {i.restantes === 0 ? " · esgotado" : i.restantes !== null ? ` · restam ${i.restantes}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className={cn("grid grid-cols-2 gap-2.5", linha && "contents")}>
        <Campo rotulo="Qtd" id={`${id}-qtd`}>
          <div role="group" aria-labelledby={`${id}-qtd`} className={campo}>
            <Button
              type="button"
              variant="ghost"
              aria-label="Diminuir"
              disabled={quantidade <= 1}
              onClick={() => setQtd(Math.max(1, quantidade - 1))}
              className="h-full w-11 rounded-none text-foreground tablet:w-8"
            >
              <Minus className="size-4" />
            </Button>
            <output aria-live="polite" className="min-w-[26px] flex-1 text-center text-[15px] font-semibold tablet:text-[13px]">
              {quantidade}
            </output>
            <Button
              type="button"
              variant="ghost"
              aria-label="Aumentar"
              disabled={quantidade >= maximo}
              onClick={() => setQtd(Math.min(maximo, quantidade + 1))}
              className="h-full w-11 rounded-none text-foreground tablet:w-8"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </Campo>

        <div className="flex min-w-0 flex-col gap-1">
          <Label htmlFor={`${id}-preco`}>Preço un.</Label>
          <div className={cn(campo, "gap-1.5 px-3 tablet:px-2.5", linha && "w-[100px]")}>
            <span className="text-[11px] text-muted-foreground">R$</span>
            <input
              id={`${id}-preco`}
              inputMode="decimal"
              autoComplete="off"
              value={texto}
              onChange={(e) => setPrecoTexto(e.target.value)}
              aria-invalid={preco === null ? true : undefined}
              className="h-full w-full min-w-0 bg-transparent text-sm text-foreground outline-none tablet:text-xs"
            />
          </div>
        </div>
      </div>

    </>
  );

  const campoPagamento = (
    <Campo rotulo="Pagamento" id={`${id}-pagamento`}>
      <ToggleGroup
        type="single"
        aria-labelledby={`${id}-pagamento`}
        value={pagamento}
        onValueChange={(v) => v && setPagamento(v as typeof pagamento)}
      >
        <ToggleGroupItem value="pendente" className={segmento}>
          Pendente
        </ToggleGroupItem>
        <ToggleGroupItem value="pix" className={segmento}>
          Pix
        </ToggleGroupItem>
        <ToggleGroupItem value="dinheiro" className={segmento}>
          Dinheiro
        </ToggleGroupItem>
      </ToggleGroup>
    </Campo>
  );

  const mensagem = erro && (
    <p role="alert" className={cn("text-[11px] text-warn", linha && "basis-full")}>
      {erro}
    </p>
  );

  if (linha) {
    return (
      <Card className="shadow-float">
        <form
          aria-label="Nova venda ou reserva"
          onSubmit={registrar}
          className="flex flex-wrap items-end gap-2.5 p-3.5"
        >
          {campos}
          <div className="ml-auto flex items-end gap-2.5">
            {campoPagamento}
            <Button type="submit" disabled={salvando} className="h-[38px] px-4 font-semibold">
              {rotuloBotao}
            </Button>
          </div>
          {mensagem}
        </form>
      </Card>
    );
  }

  return (
    <form aria-label="Nova venda ou reserva" onSubmit={registrar} className="flex flex-col gap-3">
      {campos}
      {campoPagamento}
      {mensagem}
      <Button type="submit" size="lg" disabled={salvando} className="h-12 rounded-xl text-sm">
        {rotuloBotao}
      </Button>
    </form>
  );
}
