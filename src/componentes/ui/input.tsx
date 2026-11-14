import * as React from "react";
import { cn } from "cn";

// Campo do DESIGN.md: fundo `muted`, borda `input`. Celular 42px e raio 10px; tablet e desktop
// 34px e raio 8px. Foco com contorno `ring`, como os botões.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[42px] w-full min-w-0 rounded-[10px] border border-input bg-muted px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground",
        "tablet:h-[34px] tablet:rounded-lg tablet:text-xs",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-warn",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
