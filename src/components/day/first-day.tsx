"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NewDay } from "./new-day";

/** Sales and Menu without any sale day: in place of the screen content. */
export function FirstDay({
  today,
  onSelectDay,
  description = "Crie o primeiro dia para montar o cardápio e registrar vendas.",
}: {
  today: string;
  onSelectDay: (dayId: string) => void;
  description?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="items-center gap-1 px-6 py-10 text-center">
      <h2 className="text-sm font-semibold">Nenhum dia de venda ainda</h2>
      <p className="max-w-[420px] text-xs text-muted-foreground">{description}</p>
      <NewDay days={[]} today={today} open={open} onOpenChange={setOpen} onSelectDay={onSelectDay}>
        <Button className="mt-3" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(true)}>
          Criar dia de venda
        </Button>
      </NewDay>
    </Card>
  );
}
