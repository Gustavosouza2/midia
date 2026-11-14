"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/componentes/ui/toggle-group";
import { getLocalDb, type DiaDeVenda } from "@/local-db";
import { criarDia, ErroDeEscrita } from "@/local-db/escritas";
import { dataDoNovoDia } from "@/lib/dias";
import { rotuloDia } from "@/lib/formato";

export function FormularioNovoDia({
  dias,
  hoje,
  aoCancelar,
  aoEscolherDia,
}: {
  dias: DiaDeVenda[];
  hoje: string;
  aoCancelar: () => void;
  aoEscolherDia: (diaId: string) => void;
}) {
  const id = useId();
  const [data, setData] = useState(() => dataDoNovoDia(dias, hoje));
  const [nome, setNome] = useState("");
  const [cardapio, setCardapio] = useState<"copiar" | "padrao">(dias.length > 0 ? "copiar" : "padrao");
  const [origem, setOrigem] = useState(dias[0]?.id ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const repetido = dias.find((d) => d.data === data);

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    if (!data || repetido) return;
    setCriando(true);
    setErro(null);
    try {
      const diaId = await criarDia(getLocalDb(), {
        data,
        nome,
        cardapio: cardapio === "copiar" ? { tipo: "copiar", diaId: origem } : { tipo: "padrao" },
      });
      aoEscolherDia(diaId);
    } catch (e) {
      setErro(e instanceof ErroDeEscrita ? e.message : "Não foi possível criar o dia.");
      setCriando(false);
    }
  }

  const botao = "h-11 flex-1 rounded-[10px] text-[13px] tablet:h-[34px] tablet:rounded-lg tablet:text-xs";

  return (
    <form onSubmit={criar} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-data`}>Data</Label>
        <Input
          id={`${id}-data`}
          type="date"
          required
          value={data}
          onChange={(e) => setData(e.target.value)}
          aria-invalid={repetido ? true : undefined}
          aria-describedby={repetido ? `${id}-repetido` : undefined}
        />
        {repetido && (
          <p id={`${id}-repetido`} className="text-[11px] text-warn">
            Já existe um dia em {rotuloDia(repetido.data)}.{" "}
            <button
              type="button"
              onClick={() => aoEscolherDia(repetido.id)}
              className="font-semibold underline underline-offset-2"
            >
              Abrir esse dia
            </button>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-nome`}>Nome (opcional)</Label>
        <Input
          id={`${id}-nome`}
          placeholder="Ex.: Culto de jovens"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span id={`${id}-cardapio`} className="text-[11px] text-muted-foreground">
          Cardápio
        </span>
        <ToggleGroup
          type="single"
          aria-labelledby={`${id}-cardapio`}
          value={cardapio}
          onValueChange={(v) => v && setCardapio(v as typeof cardapio)}
        >
          <ToggleGroupItem value="copiar" disabled={dias.length === 0}>
            Copiar de outro dia
          </ToggleGroupItem>
          <ToggleGroupItem value="padrao">Preço padrão</ToggleGroupItem>
        </ToggleGroup>
        {cardapio === "copiar" && (
          <select
            aria-label="Copiar de"
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            className="h-[42px] rounded-[10px] border border-input bg-muted px-2.5 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring tablet:h-[34px] tablet:rounded-lg tablet:text-xs"
          >
            {dias.map((d) => (
              <option key={d.id} value={d.id}>
                {rotuloDia(d.data)}
                {d.nome ? ` · ${d.nome}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {erro && (
        <p role="alert" className="text-[11px] text-warn">
          {erro}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={aoCancelar} className={botao}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!data || !!repetido || criando} className={`${botao} font-semibold`}>
          {data ? `Criar dia · ${rotuloDia(data)}` : "Criar dia"}
        </Button>
      </div>
    </form>
  );
}
