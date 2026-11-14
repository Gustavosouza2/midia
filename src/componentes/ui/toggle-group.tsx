"use client";

import * as React from "react";
import { cn } from "cn";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { toggleClasses } from "@/componentes/ui/toggle";

// Grupo segmentado do DESIGN.md (Venda/Reserva, Pagamento, Cardápio do novo dia): fundo `muted`,
// borda `input`, 3px de respiro em volta dos segmentos.
function ToggleGroup({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn(
        "flex gap-0.5 rounded-[10px] border border-input bg-muted p-[3px] tablet:rounded-lg",
        className,
      )}
      {...props}
    />
  );
}

function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return <ToggleGroupPrimitive.Item data-slot="toggle-group-item" className={cn(toggleClasses, className)} {...props} />;
}

export { ToggleGroup, ToggleGroupItem };
