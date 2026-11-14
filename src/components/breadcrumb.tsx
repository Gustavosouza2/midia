import type { ComponentType, ReactNode } from "react";

export function Migalha({
  Icone,
  titulo,
  children,
}: {
  Icone: ComponentType<{ tamanho?: number }>;
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <header className="hidden items-center justify-between gap-3 tablet:flex">
      <span className="inline-flex h-7.5 items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 text-xs text-muted-foreground">
        <Icone tamanho={12} />
        {titulo}
      </span>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}
