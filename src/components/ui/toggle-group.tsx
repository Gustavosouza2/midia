"use client";

import * as React from "react";
import { cn } from "cn";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { toggleClasses } from "@/components/ui/toggle";

// DESIGN.md segmented group (Venda/Reserva, Pagamento, the new day's Cardápio): `muted` background,
// `input` border, 3px of padding around the segments.
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
