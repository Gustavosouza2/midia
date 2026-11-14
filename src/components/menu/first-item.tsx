import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Empty menu: the first step is registering the items; the sale day comes later. */
export function FirstItem({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="items-center gap-1 px-6 py-10 text-center">
      <h2 className="text-sm font-semibold">Nenhum item no cardápio ainda</h2>
      <p className="max-w-[420px] text-xs text-muted-foreground">
        Comece cadastrando o que a cantina vende, com o preço padrão de cada item. Depois você cria o dia de
        venda e escolhe quanto tem de cada um.
      </p>
      <Button className="mt-3" onClick={onAdd}>
        <Plus className="size-3.5" strokeWidth={2.4} />
        Adicionar item
      </Button>
    </Card>
  );
}
