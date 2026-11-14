"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getLocalDb, type SaleDay } from "@/local-db";
import { createDay, WriteError } from "@/local-db/writes";
import { newDayDate } from "@/lib/days";
import { shortDate } from "@/lib/format";

export function NewDayForm({
  days,
  today,
  onCancel,
  onSelectDay,
}: {
  days: SaleDay[];
  today: string;
  onCancel: () => void;
  onSelectDay: (dayId: string) => void;
}) {
  const id = useId();
  const [date, setDate] = useState(() => newDayDate(days, today));
  const [name, setName] = useState("");
  const [menu, setMenu] = useState<"copy" | "default">(days.length > 0 ? "copy" : "default");
  const [origin, setOrigin] = useState(days[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const duplicate = days.find((d) => d.date === date);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!date || duplicate) return;
    setCreating(true);
    setError(null);
    try {
      const dayId = await createDay(getLocalDb(), {
        date,
        name,
        menu: menu === "copy" ? { type: "copy", dayId: origin } : { type: "default" },
      });
      onSelectDay(dayId);
    } catch (e) {
      setError(e instanceof WriteError ? e.message : "Não foi possível criar o dia.");
      setCreating(false);
    }
  }

  const buttonClass = "h-11 flex-1 rounded-[10px] text-[13px] tablet:h-[34px] tablet:rounded-lg tablet:text-xs";

  return (
    <form onSubmit={create} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-date`}>Data</Label>
        <Input
          id={`${id}-date`}
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={duplicate ? true : undefined}
          aria-describedby={duplicate ? `${id}-duplicate` : undefined}
        />
        {duplicate && (
          <p id={`${id}-duplicate`} className="text-[11px] text-warn">
            Já existe um dia em {shortDate(duplicate.date)}.{" "}
            <button
              type="button"
              onClick={() => onSelectDay(duplicate.id)}
              className="font-semibold underline underline-offset-2"
            >
              Abrir esse dia
            </button>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-name`}>Nome (opcional)</Label>
        <Input
          id={`${id}-name`}
          placeholder="Ex.: Culto de jovens"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span id={`${id}-menu`} className="text-[11px] text-muted-foreground">
          Cardápio
        </span>
        <ToggleGroup
          type="single"
          aria-labelledby={`${id}-menu`}
          value={menu}
          onValueChange={(v) => v && setMenu(v as typeof menu)}
        >
          <ToggleGroupItem value="copy" disabled={days.length === 0}>
            Copiar de outro dia
          </ToggleGroupItem>
          <ToggleGroupItem value="default">Preço padrão</ToggleGroupItem>
        </ToggleGroup>
        {menu === "copy" && (
          <select
            aria-label="Copiar de"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="h-[42px] rounded-[10px] border border-input bg-muted px-2.5 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring tablet:h-[34px] tablet:rounded-lg tablet:text-xs"
          >
            {days.map((d) => (
              <option key={d.id} value={d.id}>
                {shortDate(d.date)}
                {d.name ? ` · ${d.name}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <p role="alert" className="text-[11px] text-warn">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className={buttonClass}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!date || !!duplicate || creating} className={`${buttonClass} font-semibold`}>
          {date ? `Criar dia · ${shortDate(date)}` : "Criar dia"}
        </Button>
      </div>
    </form>
  );
}
