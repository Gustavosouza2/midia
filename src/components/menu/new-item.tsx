"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLocalDb } from "@/local-db";
import { addProduct, WriteError } from "@/local-db/writes";
import { parseReais } from "@/lib/menu";
import { CurrencyField } from "./currency-field";

/**
 * Inline "Nome · Preço · Adicionar" row. Registers the item with the default price and, with a day selected,
 * puts it on sale there. Enter submits and focus goes back to the name for the next item.
 */
export function NewItem({ dayId, autoFocus = false }: { dayId: string | null; autoFocus?: boolean }) {
  const nameInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const priceCents = parseReais(price);
    setSaved(null);
    if (!name.trim()) return setError("Dê um nome ao item.");
    if (priceCents === null) return setError("Preço inválido. Use reais, como 12 ou 12,50.");
    setSaving(true);
    setError(null);
    try {
      await addProduct(getLocalDb(), { name, priceCents, forSaleOnDay: dayId ?? undefined });
      setSaved(`${name.trim().replace(/\s+/g, " ")} entrou no cardápio.`);
      setName("");
      setPrice("");
    } catch (e) {
      setError(e instanceof WriteError ? e.message : "Não foi possível salvar o item.");
    } finally {
      setSaving(false);
      nameInput.current?.focus();
    }
  }

  return (
    <form onSubmit={save} aria-label="Novo item" className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Input
          ref={nameInput}
          aria-label="Nome do item"
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder="Novo item"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-background"
        />
        <div className="w-[96px] flex-none tablet:w-[120px]">
          <CurrencyField
            aria-label="Preço padrão"
            placeholder="0,00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={saving} className="h-[42px] flex-none rounded-[10px] px-3.5 tablet:h-[34px] tablet:rounded-lg">
          Adicionar
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-[11px] text-warn">
          {error}
        </p>
      ) : (
        <p role="status" className="text-[11px] text-ok empty:hidden">
          {saved}
        </p>
      )}
    </form>
  );
}
