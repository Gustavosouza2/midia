"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLocalDb } from "@/local-db";
import { adicionarProduto, ErroDeEscrita } from "@/local-db/writes";
import { lerReais } from "@/lib/menu";
import { CampoDeReais } from "./currency-field";

/**
 * "Adicionar item": cadastra o item com o preço padrão e, se houver dia aberto, já o põe à venda nele.
 * Depois de salvar, o formulário fica aberto e limpo para o próximo item; "Cancelar" fecha.
 */
export function NovoItem({ diaId, aoFechar }: { diaId: string | null; aoFechar: () => void }) {
  const id = useId();
  const campoNome = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const precoCentavos = lerReais(preco);
    if (!nome.trim()) return setErro("Dê um nome ao item.");
    if (precoCentavos === null) return setErro("Preço inválido. Use reais, como 12 ou 12,50.");
    setSalvando(true);
    setErro(null);
    setSalvo(null);
    try {
      await adicionarProduto(getLocalDb(), { nome, precoCentavos, aVendaNoDia: diaId ?? undefined });
      setSalvo(`${nome.trim().replace(/\s+/g, " ")} entrou no cardápio. Adicione o próximo ou feche.`);
      setNome("");
      setPreco("");
      campoNome.current?.focus();
    } catch (e) {
      setErro(e instanceof ErroDeEscrita ? e.message : "Não foi possível salvar o item.");
    } finally {
      setSalvando(false);
    }
  }

  const botao = "h-[42px] rounded-[10px] px-3.5 text-[13px] tablet:h-9 tablet:rounded-lg tablet:px-3 tablet:text-xs";

  return (
    <Card
      className="p-3.5 shadow-[0_1px_2px_rgba(17,17,19,.06),0_8px_24px_rgba(17,17,19,.06)]"
    >
      <form onSubmit={salvar} aria-label="Novo item" className="flex flex-col gap-2.5 tablet:flex-row tablet:flex-wrap tablet:items-end">
        <strong className="font-semibold tablet:hidden">Novo item</strong>
        <div className="flex flex-col gap-1 tablet:flex-[1_1_240px]">
          <Label htmlFor={`${id}-nome`}>Nome do item</Label>
          <Input
            id={`${id}-nome`}
            ref={campoNome}
            autoFocus
            placeholder="Ex.: Pão de queijo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="bg-background tablet:h-9"
          />
        </div>
        <div className="flex flex-col gap-1 tablet:w-[140px]">
          <Label htmlFor={`${id}-preco`}>Preço padrão</Label>
          <CampoDeReais
            id={`${id}-preco`}
            placeholder="0,00"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            className="tablet:h-9"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={salvando} className={`${botao} flex-1`}>
            Salvar item
          </Button>
          <Button type="button" variant="outline" onClick={aoFechar} className={`${botao} text-text-2 tablet:text-foreground`}>
            {salvo ? "Fechar" : "Cancelar"}
          </Button>
        </div>
        {erro ? (
          <p role="alert" className="basis-full text-[11px] text-warn">
            {erro}
          </p>
        ) : (
          <p role="status" className="basis-full text-[11px] text-ok empty:hidden">
            {salvo}
          </p>
        )}
      </form>
    </Card>
  );
}
