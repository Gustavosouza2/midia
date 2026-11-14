import type { ComponentProps } from "react";
import { cn } from "cn";
import { Input } from "@/componentes/ui/input";

/** Campo de valor com o "R$" dentro, à esquerda. */
export function CampoDeReais({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[11px] text-muted-foreground tablet:left-2.5"
      >
        R$
      </span>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={cn("bg-background pl-9 tablet:pl-8", className)}
        {...props}
      />
    </div>
  );
}
