import type { ReactNode } from "react";

const TONS = { warn: "text-warn" } as const;

export function Numero({
  rotulo,
  valor,
  tom,
  children,
}: {
  rotulo: string;
  valor: string;
  /** Valor em laranja, como o Pendente. */
  tom?: "warn";
  /** Detalhe abaixo do valor, alinhado ao pé da coluna. */
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 bg-background p-3.5 tablet:px-5 tablet:py-[18px]">
      <span className="text-[11px] text-muted-foreground">{rotulo}</span>
      <strong
        className={`text-lg leading-[1.15] font-semibold tracking-[-0.02em] tablet:text-2xl ${tom ? TONS[tom] : ""}`}
      >
        {valor}
      </strong>
      <div className="mt-auto flex flex-col gap-1.5 text-[11px] text-muted-foreground">{children}</div>
    </div>
  );
}
