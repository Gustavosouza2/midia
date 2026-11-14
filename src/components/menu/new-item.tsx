"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLocalDb } from "@/local-db";
import { addProduct, WriteError } from "@/local-db/writes";
import { parseReais } from "@/lib/menu";
import { CurrencyField } from "./currency-field";

/**
 * "Adicionar item": registers the item with the default price and, if a day is open, puts it on sale there.
 * After saving, the form stays open and clear for the next item; "Cancelar" closes it.
 */
export function NewItem({ dayId, onClose }: { dayId: string | null; onClose: () => void }) {
  const id = useId();
  const nameInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const priceCents = parseReais(price);
    if (!name.trim()) return setError("Dê um nome ao item.");
    if (priceCents === null) return setError("Preço inválido. Use reais, como 12 ou 12,50.");
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      await addProduct(getLocalDb(), { name, priceCents, forSaleOnDay: dayId ?? undefined });
      setSaved(`${name.trim().replace(/\s+/g, " ")} entrou no cardápio. Adicione o próximo ou feche.`);
      setName("");
      setPrice("");
      nameInput.current?.focus();
    } catch (e) {
      setError(e instanceof WriteError ? e.message : "Não foi possível salvar o item.");
    } finally {
      setSaving(false);
    }
  }

  const buttonClass = "h-[42px] rounded-[10px] px-3.5 text-[13px] tablet:h-9 tablet:rounded-lg tablet:px-3 tablet:text-xs";

  return (
    <Card
      className="p-3.5 shadow-[0_1px_2px_rgba(17,17,19,.06),0_8px_24px_rgba(17,17,19,.06)]"
    >
      <form onSubmit={save} aria-label="Novo item" className="flex flex-col gap-2.5 tablet:flex-row tablet:flex-wrap tablet:items-end">
        <strong className="font-semibold tablet:hidden">Novo item</strong>
        <div className="flex flex-col gap-1 tablet:flex-[1_1_240px]">
          <Label htmlFor={`${id}-name`}>Nome do item</Label>
          <Input
            id={`${id}-name`}
            ref={nameInput}
            autoFocus
            placeholder="Ex.: Pão de queijo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-background tablet:h-9"
          />
        </div>
        <div className="flex flex-col gap-1 tablet:w-[140px]">
          <Label htmlFor={`${id}-price`}>Preço padrão</Label>
          <CurrencyField
            id={`${id}-price`}
            placeholder="0,00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="tablet:h-9"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className={`${buttonClass} flex-1`}>
            Salvar item
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className={`${buttonClass} text-text-2 tablet:text-foreground`}>
            {saved ? "Fechar" : "Cancelar"}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="basis-full text-[11px] text-warn">
            {error}
          </p>
        ) : (
          <p role="status" className="basis-full text-[11px] text-ok empty:hidden">
            {saved}
          </p>
        )}
      </form>
    </Card>
  );
}
